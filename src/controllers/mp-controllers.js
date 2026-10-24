import { Preference } from "mercadopago";
import { mpClient } from "../service/payment/mp-client.js";
import { prepararOrden, itemsParaMercadoPago } from "../service/payment/checkout-service.js";
import { procesarPago } from "../service/payment/mp-payment-service.js";
import { verificarFirmaMP } from "../service/payment/mp-signature.js";
import OrderModel from "../dao/models/order-model.js";
import AppError from "../utils/app-error.js";

const FRONT_URL = (process.env.FRONT_URL || "https://www.buloneraeltriangulo.com").replace(/\/$/, "");
const NOTIFICATION_URL = process.env.MP_NOTIFICATION_URL;

if (!NOTIFICATION_URL) {
  console.warn(
    "⚠️ MP_NOTIFICATION_URL no está definida: Mercado Pago no va a avisar los pagos a este servidor.",
  );
}

// POST /api/mp/create_order
// Body: { items: [{ productId, quantity }], comprador: {...}, envio: {...} }
// Crea la orden "pendiente_pago" con precios calculados en el servidor y la preferencia de pago.
export const createOrder = async (req, res, next) => {
  try {
    const datosOrden = await prepararOrden({ body: req.body, user: req.user });
    const order = await OrderModel.create(datosOrden);

    const backUrl = `${FRONT_URL}/gracias`;
    const body = {
      items: itemsParaMercadoPago(order),
      payer: {
        name: order.comprador.nombre,
        surname: order.comprador.apellido,
        email: order.comprador.email,
      },
      payment_methods: {
        installments: 3,
        excluded_payment_types: [{ id: "ticket" }],
        excluded_payment_methods: [],
      },
      external_reference: String(order._id),
      metadata: { order_id: String(order._id) },
      ...(NOTIFICATION_URL ? { notification_url: NOTIFICATION_URL } : {}),
      back_urls: { success: backUrl, failure: backUrl, pending: backUrl },
      // Mercado Pago solo acepta el retorno automático con URLs https
      ...(FRONT_URL.startsWith("https://") ? { auto_return: "approved" } : {}),
    };

    let preference;
    try {
      preference = await new Preference(mpClient).create({ body });
    } catch (error) {
      await OrderModel.deleteOne({ _id: order._id });
      console.error(
        "Error creando la preferencia de Mercado Pago:",
        error?.message,
        error?.cause ? JSON.stringify(error.cause).slice(0, 500) : "",
      );
      throw new AppError(
        502,
        "No pudimos iniciar el pago con Mercado Pago. Probá de nuevo en unos minutos.",
      );
    }

    order.mercadoPago.preferenceId = preference.id;
    await order.save();

    res.status(201).json({
      preferenceId: preference.id,
      init_point: preference.init_point,
      orderId: order._id,
      orderNumber: order.orderNumber,
      total: order.total,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/mp/webhook — notificaciones de Mercado Pago
export const mercadoPagoWebhook = async (req, res) => {
  const type = req.query.type || req.body?.type || req.query.topic;
  const dataId =
    req.query["data.id"] ||
    req.body?.data?.id ||
    (req.query.topic === "payment" ? req.query.id : undefined);

  // Firma de Mercado Pago. Por defecto se registra en el log pero NO bloquea el aviso:
  // los avisos que genera la notification_url de la preferencia no siempre validan con la
  // clave secreta, y la seguridad real ya está en procesarPago(), que consulta el pago a la
  // API de Mercado Pago con nuestro token y verifica orden y monto.
  // Con MP_WEBHOOK_STRICT=true se rechazan los avisos con firma inválida.
  const secret = process.env.MP_WEBHOOK_SECRET;
  const xSignature = req.headers["x-signature"];
  const estricto = process.env.MP_WEBHOOK_STRICT === "true";

  if (secret && xSignature) {
    const firmaValida = verificarFirmaMP({
      xSignature,
      xRequestId: req.headers["x-request-id"],
      dataId: req.query["data.id"] || req.body?.data?.id,
      secret,
    });
    if (!firmaValida && estricto) {
      console.warn(`Webhook de Mercado Pago con firma inválida: rechazado (type=${type})`);
      return res.sendStatus(401);
    }
  }

  if (type !== "payment" || !dataId) {
    return res.sendStatus(200);
  }

  try {
    await procesarPago(dataId);
    res.sendStatus(200);
  } catch (error) {
    // 500 → Mercado Pago reintenta la notificación más tarde
    console.error(`Error procesando el pago ${dataId}:`, error?.message);
    res.sendStatus(500);
  }
};
