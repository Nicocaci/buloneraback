import {
  cotizarCosto,
  getTracking,
  getEnvio,
  getCondiciones,
  getEtiqueta,
} from "../service/enviopack/shipping.js";
import {
  obtenerOpcionesEnvio,
  validarParametrosCotizacion,
} from "../service/enviopack/quote-service.js";
import { createEnviopackShipment } from "../service/enviopack/order-shipping-service.js";
import OrderModel from "../dao/models/order-model.js";

const CONDICION_TO_STATUS = {
  T: "enviado",
  E: "entregado",
  C: "cancelado",
};
const CONDICIONES_CON_ALERTA = new Set(["R", "D", "A"]);
function mapCondicionToStatus(condicion) {
  return CONDICION_TO_STATUS[condicion] || null;
}

const FORMATOS_ETIQUETA = ["pdf", "jpg"];

// Log sin datos personales: solo el detalle técnico del error de Enviopack.
const logEnviopackError = (contexto, err) => {
  const detalle = err.response?.data
    ? JSON.stringify(err.response.data).slice(0, 500)
    : err.message;
  console.error(`Enviopack error (${contexto}):`, err.response?.status ?? "", detalle);
};

// Pública (la usa el checkout). Tiene rate limit en shipping.router.js.
export async function getShippingOptions(req, res) {
  const params = {
    provincia: req.query.provincia,
    codigo_postal: req.query.codigo_postal,
    peso: req.query.peso,
    paquetes: req.query.paquetes,
    localidad: req.query.localidad,
  };

  const error = validarParametrosCotizacion(params);
  if (error) return res.status(400).json({ message: error });

  try {
    const options = await obtenerOpcionesEnvio(params);
    res.json(options);
  } catch (err) {
    logEnviopackError("opciones", err);
    res.status(502).json({ message: "Error al obtener las opciones de envío" });
  }
}

// Solo admin
export async function shipOrder(req, res) {
  try {
    const { orderId } = req.params;
    const orderData = req.body;
    const shippingChoice = orderData.shippingChoice;

    const { pedido, envio } = await createEnviopackShipment({
      orderId,
      nombre: orderData.nombre,
      apellido: orderData.apellido,
      email: orderData.email,
      monto: orderData.monto,
      provincia: orderData.provincia,
      localidad: orderData.localidad,
      calle: orderData.calle,
      numero: orderData.numero,
      codigo_postal: orderData.codigo_postal,
      paquetes: orderData.paquetes,
      shippingChoice,
    });

    res.json({ pedido, envio });
  } catch (err) {
    logEnviopackError("crear envío", err);
    res.status(502).json({ message: "No se pudo confirmar el envío" });
  }
}

// Solo admin
export async function getShipmentTracking(req, res) {
  const envioId = Number(req.params.envioId);
  if (!Number.isInteger(envioId) || envioId <= 0) {
    return res.status(400).json({ message: "ID de envío inválido" });
  }
  try {
    const tracking = await getTracking(envioId);
    res.json(tracking);
  } catch (err) {
    logEnviopackError("tracking", err);
    res.status(502).json({ message: "No se pudo obtener el tracking" });
  }
}

// Llamado por Enviopack (pública). Los datos se vuelven a consultar a la API de Enviopack,
// así que una notificación falsa no puede cambiar el estado de una orden.
export async function handleEnviopackWebhook(req, res) {
  const { tipo, id } = req.query;

  res.sendStatus(200);

  if (!id || !tipo) return;

  try {
    if (tipo === "envio-procesado" || tipo === "envio-cambio-condicion") {
      const envio = await getEnvio(id);

      const order = await OrderModel.findOne({
        "enviopack.envioId": Number(id),
      });
      if (!order) {
        console.warn(`Webhook Enviopack: no se encontró orden para envioId ${id}`);
        return;
      }

      order.enviopack.condicion = envio.condicion;
      order.enviopack.trackingNumber =
        envio.tracking_number || order.enviopack.trackingNumber;

      const status = mapCondicionToStatus(envio.condicion);
      if (status) {
        order.status = status;
      }

      if (CONDICIONES_CON_ALERTA.has(envio.condicion)) {
        console.warn(
          `⚠️ Orden ${order._id} requiere atención — condición Enviopack: ${envio.condicion} (${envio.sub_condicion || "sin subcondición"})`,
        );
        order.enviopack.necesitaAtencion = true;
      } else {
        order.enviopack.necesitaAtencion = false;
      }

      await order.save();
      console.log(
        `Orden ${order._id} actualizada: condicion=${envio.condicion}, status=${order.status}`,
      );
    }
  } catch (err) {
    logEnviopackError("webhook", err);
  }
}

// Solo admin
export async function getShippingCost(req, res) {
  const params = {
    provincia: req.query.provincia,
    codigo_postal: req.query.codigo_postal,
    peso: req.query.peso,
    paquetes: req.query.paquetes,
  };
  const error = validarParametrosCotizacion(params);
  if (error) return res.status(400).json({ message: error });

  try {
    const cotizaciones = await cotizarCosto({
      ...params,
      codigo_postal: Number(params.codigo_postal),
      peso: Number(params.peso),
    });
    res.json(cotizaciones);
  } catch (err) {
    logEnviopackError("costo", err);
    res.status(502).json({ message: "No se pudo obtener el costo de envío" });
  }
}

// Solo admin
export async function getShippingCondiciones(req, res) {
  try {
    const data = await getCondiciones();
    res.json(data);
  } catch (err) {
    logEnviopackError("condiciones", err);
    res.status(502).json({ message: "No se pudo obtener las condiciones" });
  }
}

// Solo admin
export async function getShippingLabel(req, res) {
  const envioId = Number(req.params.envioId);
  if (!Number.isInteger(envioId) || envioId <= 0) {
    return res.status(400).json({ message: "ID de envío inválido" });
  }

  const formato = FORMATOS_ETIQUETA.includes(req.query.formato)
    ? req.query.formato
    : "pdf";
  const bulto = /^\d{1,3}$/.test(req.query.bulto || "") ? req.query.bulto : undefined;

  try {
    const archivo = await getEtiqueta(envioId, formato, bulto);

    res.set({
      "Content-Type": formato === "jpg" ? "image/jpeg" : "application/pdf",
      "Content-Disposition": `inline; filename="etiqueta-${envioId}.${formato}"`,
    });
    res.send(Buffer.from(archivo));
  } catch (err) {
    const detalle = err.response?.data
      ? Buffer.from(err.response.data).toString().slice(0, 500)
      : err.message;
    console.error("Enviopack error (etiqueta):", detalle);

    // Si el envío todavía no está "Procesado", Enviopack devuelve error acá
    res.status(err.response?.status || 502).json({
      message: "No se pudo obtener la etiqueta (¿el envío ya está en estado Procesado?)",
    });
  }
}
