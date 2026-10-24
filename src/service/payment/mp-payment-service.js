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
import { createEnviopackShipment } from "../enviopack/order-shipping-service.js";

const TOLERANCIA_MONTO = 0.5; // pesos

const ESTADOS_PENDIENTES = ["pending", "in_process", "authorized"];
const ESTADOS_RECHAZADOS = ["rejected", "cancelled"];
const ESTADOS_REEMBOLSO = ["refunded", "charged_back"];

const aceptaPagosDePrueba = () => process.env.MP_ACCEPT_TEST_PAYMENTS === "true";
const crearEnviosHabilitado = () => process.env.ENVIOPACK_CREAR_ENVIOS !== "false";

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
    console.warn(`Pago ${payment.id} sin orden asociada (external_reference inválido)`);
    return { procesado: false, motivo: "sin orden" };
  }
  if (orderIdEsperado && String(orderIdEsperado) !== String(orderId)) {
    return { procesado: false, motivo: "el pago no pertenece a esta orden" };
  }

  const order = await OrderModel.findById(orderId);
  if (!order) {
    console.warn(`Pago ${payment.id}: no existe la orden ${orderId}`);
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

  await ejecutarPostPago(actualizada, payment, { crearEnvio: resultado === "confirmada" });
  return { procesado: true };
}

// Tareas posteriores a un pago aprobado. Si alguna falla, la orden queda marcada para revisión,
// pero el pago ya quedó registrado.
async function ejecutarPostPago(order, payment, { crearEnvio }) {
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
  const opcion = order.envio?.opcion || {};
  const direccion = order.shippingAddress || {};

  const shippingMethodLabel = esRetiro
    ? "Retiro local"
    : `${opcion.tipo === "sucursal" ? "A sucursal" : "A domicilio"} — ${opcion.correo || ""} (${opcion.servicio || ""})`;

  const shippingAddressLabel = esRetiro
    ? undefined
    : `${direccion.calle} ${direccion.numero}, ${direccion.ciudad}, ${direccion.provincia} (CP ${direccion.codigoPostal})`;

  if (email) {
    sendOrderConfirmationEmail({
      to: email,
      orderId: order.orderNumber,
      items: itemsParaEmail,
      total: order.total,
      shippingCost: order.shippingCost,
      customerName: comprador.nombre,
      shippingMethod: shippingMethodLabel,
      shippingAddress: shippingAddressLabel,
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
    shippingAddress: shippingAddressLabel,
    shippingMethod: shippingMethodLabel,
    paymentMethod: "Mercado Pago",
  }).catch((err) =>
    console.error(`Error enviando aviso a la tienda (orden #${order.orderNumber}):`, err.message),
  );

  // 3. Envío en Enviopack
  if (esRetiro || !crearEnvio) return;

  if (!crearEnviosHabilitado()) {
    console.log(`ENVIOPACK_CREAR_ENVIOS=false: no se crea el envío de la orden #${order.orderNumber}`);
    return;
  }

  try {
    await createEnviopackShipment({
      orderId: order._id,
      nombre: comprador.nombre,
      apellido: comprador.apellido,
      email,
      monto: order.total,
      provincia: direccion.provincia,
      localidad: direccion.ciudad,
      calle: direccion.calle,
      numero: direccion.numero,
      codigo_postal: direccion.codigoPostal,
      paquetes: order.envio.paquetes,
      shippingChoice: opcion,
    });
  } catch (err) {
    console.error(
      `Error creando envío Enviopack (orden #${order.orderNumber}):`,
      err.response?.status ?? "",
      err.response?.data ? JSON.stringify(err.response.data).slice(0, 300) : err.message,
    );
    const motivo = "El pago se aprobó, pero no se pudo crear el envío en Enviopack. Crealo a mano.";
    await OrderModel.updateOne(
      { _id: order._id },
      { $set: { necesitaAtencion: true, motivoAtencion: motivo } },
    );
    avisarTienda(order.orderNumber, motivo);
  }
}
