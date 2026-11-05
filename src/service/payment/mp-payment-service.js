// Procesa un pago de Mercado Pago: lo consulta a la API de Mercado Pago (nunca se confía en
// los datos de la notificación), busca la orden por external_reference y aplica el estado.
import mongoose from "mongoose";
import { Payment } from "mercadopago";
import { mpClient } from "./mp-client.js";
import OrderModel from "../../dao/models/order-model.js";
import CartModel from "../../dao/models/cart-model.js";
import OrderService from "../order-service.js";
import {
  sendOrderConfirmationEmail,
  sendStoreNotificationEmail,
  sendStoreAlertEmail,
} from "../order-email-service.js";
import { nombreProvincia } from "../../utils/provincias.js";

const TOLERANCIA_MONTO = 0.5; // pesos

const ESTADOS_PENDIENTES = ["pending", "in_process", "authorized"];
const ESTADOS_RECHAZADOS = ["rejected", "cancelled"];
const ESTADOS_REEMBOLSO = ["refunded", "charged_back"];

const aceptaPagosDePrueba = () => process.env.MP_ACCEPT_TEST_PAYMENTS === "true";

// Estado y fecha del pago para los logs: permite distinguir un pago viejo (anterior a la
// Fase 1B, cuando external_reference era el carrito) de uno nuevo que no encontró su orden.
const resumenPago = (payment) => {
  const fecha = payment.date_approved || payment.date_created;
  return fecha ? `${payment.status}, ${String(fecha).slice(0, 10)}` : String(payment.status);
};

const avisarTienda = (orderNumber, motivo) =>
  sendStoreAlertEmail({ orderNumber, motivo }).catch((err) =>
    console.error(`Error enviando alerta del pedido #${orderNumber}:`, err.message),
  );

/**
 * @param {string|number} paymentId ID del pago en Mercado Pago
 * @param {{ orderIdEsperado?: string }} opciones si se indica, el pago tiene que pertenecer a esa orden
 * @returns {Promise<{ procesado: boolean, motivo?: string }>}
 */
export async function procesarPago(paymentId, { orderIdEsperado } = {}) {
  if (!/^\d{1,20}$/.test(String(paymentId))) {
    return { procesado: false, motivo: "payment_id inválido" };
  }

  const payment = await new Payment(mpClient).get({ id: String(paymentId) });

  if (payment.live_mode === false && !aceptaPagosDePrueba()) {
    console.warn(`Pago de prueba ignorado: ${payment.id}`);
    return { procesado: false, motivo: "pago de prueba" };
  }

  const orderId = payment.external_reference;
  if (!mongoose.isValidObjectId(orderId)) {
    console.warn(
      `Pago ${payment.id} (${resumenPago(payment)}): sin orden asociada (external_reference inválido) — ignorado`,
    );
    return { procesado: false, motivo: "sin orden" };
  }
  if (orderIdEsperado && String(orderIdEsperado) !== String(orderId)) {
    return { procesado: false, motivo: "el pago no pertenece a esta orden" };
  }

  const order = await OrderModel.findById(orderId);
  if (!order) {
    console.warn(`Pago ${payment.id} (${resumenPago(payment)}): no existe la orden ${orderId} — ignorado`);
    return { procesado: false, motivo: "sin orden" };
  }

  console.log(`Pago ${payment.id} → orden #${order.orderNumber}: ${payment.status}`);

  if (payment.status === "approved") {
    return await procesarAprobado(order, payment);
  }
  if (ESTADOS_PENDIENTES.includes(payment.status)) {
    await OrderService.registrarPagoPendiente(order._id, payment);
    return { procesado: true };
  }
  if (ESTADOS_RECHAZADOS.includes(payment.status)) {
    await OrderService.registrarPagoRechazado(order._id, payment);
    return { procesado: true };
  }
  if (ESTADOS_REEMBOLSO.includes(payment.status)) {
    const actualizada = await OrderService.registrarReembolso(order._id, payment);
    if (actualizada) avisarTienda(actualizada.orderNumber, actualizada.motivoAtencion);
    return { procesado: true };
  }
  if (payment.status === "in_mediation") {
    const marcada = await OrderService.marcarParaRevision(
      order._id,
      payment,
      "El comprador inició un reclamo en Mercado Pago sobre este pago.",
    );
    if (marcada) avisarTienda(marcada.orderNumber, marcada.motivoAtencion);
    return { procesado: true };
  }

  return { procesado: false, motivo: `estado no manejado: ${payment.status}` };
}

async function procesarAprobado(order, payment) {
  const monto = Number(payment.transaction_amount);
  const montoCorrecto =
    payment.currency_id === "ARS" && Math.abs(monto - order.total) <= TOLERANCIA_MONTO;

  if (!montoCorrecto) {
    const motivo = `Pago aprobado por ${payment.currency_id} ${monto}, pero la orden es por ARS ${order.total}. No se marcó como pagada. Payment ID: ${payment.id}.`;
    console.error(`⚠️ Orden #${order.orderNumber}: ${motivo}`);
    const marcada = await OrderService.marcarParaRevision(order._id, payment, motivo);
    if (marcada) avisarTienda(order.orderNumber, motivo);
    return { procesado: true };
  }

  const { resultado, order: actualizada } = await OrderService.confirmarPago(order._id, payment);

  if (resultado === "sin_cambios") {
    return { procesado: true }; // notificación repetida: ya estaba procesada
  }

  if (resultado === "sin_stock") {
    avisarTienda(actualizada.orderNumber, actualizada.motivoAtencion);
  }

  await ejecutarPostPago(actualizada, payment);
  return { procesado: true };
}

// Tareas posteriores a un pago aprobado: limpiar el carrito y mandar los mails.
// Si alguna falla, se registra en el log; el pago ya quedó registrado.
async function ejecutarPostPago(order, payment) {
  // 1. Sacar del carrito los productos comprados
  if (order.user) {
    await CartModel.updateOne(
      { user: order.user },
      { $pull: { products: { product: { $in: order.products.map((p) => p.product) } } } },
    ).catch((err) => console.error(`Error limpiando carrito (orden #${order.orderNumber}):`, err.message));
  }

  // 2. Emails
  const comprador = order.comprador || {};
  const email = comprador.email || order.guestEmail || payment.payer?.email;
  const nombreCompleto = `${comprador.nombre || ""} ${comprador.apellido || ""}`.trim();

  const itemsParaEmail = order.products.map((item) => ({
    product: { item: item.nombre, precioConIva: item.precioUnitario },
    quantity: item.quantity,
  }));

  const esRetiro = order.envio?.metodo === "retiro_local";
  const direccion = order.shippingAddress || {};

  const shippingMethodLabel = esRetiro
    ? "Retiro en el local"
    : "Envío a domicilio (a coordinar)";

  const entrega = esRetiro
    ? { tipo: "retiro_local" }
    : {
        tipo: "envio",
        direccion: {
          calle: direccion.calle,
          numero: direccion.numero,
          pisoDepto: direccion.pisoDepto,
          ciudad: direccion.ciudad,
          provincia: nombreProvincia(direccion.provincia),
          codigoPostal: direccion.codigoPostal,
          notas: direccion.notas,
        },
      };

  if (email) {
    sendOrderConfirmationEmail({
      to: email,
      orderId: order.orderNumber,
      items: itemsParaEmail,
      total: order.total,
      shippingCost: order.shippingCost,
      customerName: comprador.nombre,
      shippingMethod: shippingMethodLabel,
      entrega,
    }).catch((err) =>
      console.error(`Error enviando email al comprador (orden #${order.orderNumber}):`, err.message),
    );
  }

  sendStoreNotificationEmail({
    orderId: order.orderNumber,
    items: itemsParaEmail,
    total: order.total,
    shippingCost: order.shippingCost,
    customerName: nombreCompleto,
    customerEmail: email,
    customerPhone: comprador.telefono || "",
    shippingMethod: shippingMethodLabel,
    entrega,
    paymentMethod: "Mercado Pago",
  }).catch((err) =>
    console.error(`Error enviando aviso a la tienda (orden #${order.orderNumber}):`, err.message),
  );
}
