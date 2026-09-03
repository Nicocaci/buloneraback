import {
  cotizarADomicilio,
  cotizarASucursal,
  cotizarCosto,
  crearPedido,
  crearEnvio,
  getTracking,
  getEnvio,
  getCondiciones,
  getEtiqueta
} from "../service/enviopack/shipping.js";
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

// 👇 Correos habilitados para envío a domicilio en tu cuenta.
// Tu cuenta usa Distribución Unificada, así que por ahora solo "enviopack"
// está realmente activo (confirmado en app.enviopack.com/configuracion/distribucion).
// Si en el futuro activás carriers individuales para domicilio, sumalos acá.
const CORREOS_HABILITADOS = ["enviopack", "oca", "urbano"];

// 👇 Filtra por tipo de despacho según si el correo tiene sucursales o no:
// - Si el correo tiene sucursales (OCA, Urbano): despacho "S" (vos llevás el paquete a la sucursal, más barato).
// - Si el correo NO tiene sucursales (Red Envíopack): despacho "D" (te lo retiran, es la única opción que existe).
function filtrarPorDespacho(cotizaciones) {
  return cotizaciones.filter((o) => o.despacho === "S");
}

function dedupeCheapestByCorreo(cotizaciones) {
  const porCorreo = new Map();

  for (const o of cotizaciones) {
    const key = `${o.correo?.id}-${o.servicio}`;
    const actual = porCorreo.get(key);
    if (!actual || Number(o.valor) < Number(actual.valor)) {
      porCorreo.set(key, o);
    }
  }

  return Array.from(porCorreo.values());
}

export async function getShippingOptions(req, res) {
  try {
    const { provincia, codigo_postal, peso, paquetes, localidad } = req.query;

    const [aDomicilio, aSucursal] = await Promise.all([
      cotizarCosto({
        provincia,
        codigo_postal: Number(codigo_postal),
        peso: Number(peso),
        paquetes,
      }),
      localidad
        ? cotizarASucursal({
            provincia,
            localidad: Number(localidad),
            peso: Number(peso),
            paquetes,
          })
        : Promise.resolve([]),
    ]);
    console.log(
      "=== COTIZACIONES ENVIÓPACK ===",
      JSON.stringify(aDomicilio, null, 2),
    );

    // 1. Filtrar por modalidad domicilio + correos habilitados
    // 2. Filtrar por tipo de despacho correcto según el correo
    // 3. Quedarnos con la más barata por correo+servicio
    const domicilioFiltrado = dedupeCheapestByCorreo(
      filtrarPorDespacho(
        aDomicilio.filter(
          (o) =>
            o.modalidad === "D" && CORREOS_HABILITADOS.includes(o.correo?.id),
        ),
      ),
    );

    const options = [
      ...domicilioFiltrado.map((o) => ({
        tipo: "domicilio",
        correo: o.correo?.id,
        despacho: o.despacho, // 👈 antes faltaba, shipOrder lo necesita para crearEnvio
        modalidad: o.modalidad,
        servicio: o.servicio,
        valor: o.valor,
        horas_entrega: o.horas_entrega,
      })),
      ...aSucursal.map((o) => ({
        tipo: "sucursal",
        correo: o.sucursal.correo.id,
        despacho: o.despacho, // 👈 mismo fix, por consistencia
        modalidad: o.modalidad,
        servicio: o.servicio,
        valor: o.valor,
        horas_entrega: o.horas_entrega,
        sucursal: o.sucursal,
      })),
    ];

    res.json(options);
  } catch (err) {
    console.error("Enviopack error:", err.response?.data || err.message);
    res.status(500).json({ err: "Error al obtener las opciones de envío" });
  }
}

export async function shipOrder(req, res) {
  try {
    const { orderId } = req.params;
    const orderData = req.body;
    const shippingChoice = orderData.shippingChoice;

    const pedido = await crearPedido({
      id_externo: orderId,
      nombre: orderData.nombre,
      apellido: orderData.apellido,
      email: orderData.email,
      monto: orderData.monto,
      fecha_alta: new Date().toISOString().slice(0, 19).replace("T", " "),
      pagado: true,
      provincia: orderData.provincia,
      localidad: orderData.localidad,
    });
    console.log("=== DATOS ENVÍO ===");
    console.log({
      direccion_envio: Number(process.env.ENVIOPACK_DIRECCION_ENVIO),
      codigo_postal: orderData.codigo_postal,
      provincia: orderData.provincia,
      localidad: orderData.localidad,
      shippingChoice,
    });
    const envio = await crearEnvio({
      pedido: pedido.id,
      direccion_envio: Number(process.env.ENVIOPACK_DIRECCION_ENVIO),
      destinatario: `${orderData.nombre} ${orderData.apellido}`,

      despacho: shippingChoice.despacho,

      modalidad: shippingChoice.modalidad,
      correo: shippingChoice.correo,
      servicio: shippingChoice.servicio,

      confirmado: true,

      calle: orderData.calle,
      numero: orderData.numero,
      codigo_postal: orderData.codigo_postal,
      provincia: orderData.provincia,
      localidad: orderData.localidad,
      paquetes: orderData.paquetes,
    });
    await OrderModel.findByIdAndUpdate(orderId, {
      "enviopack.pedidoId": pedido.id,
      "enviopack.envioId": envio.id,
    });
    res.json({ pedido, envio });
    console.log(
      "=== SHIPPING CHOICE RECIBIDO ===",
      JSON.stringify(shippingChoice, null, 2),
    );
  } catch (err) {
    console.error("Enviopack error:", err.response?.data || err.message);
    res.status(500).json({ error: "No se pudo confirmar el envío" });
  }
}

export async function getShipmentTracking(req, res) {
  try {
    const { envioId } = req.params;
    const tracking = await getTracking(Number(envioId));
    res.json(tracking);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "No se pudo obtener el tracking" });
  }
}

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
        console.warn(`Webhook: no se encontró orden para envioId ${id}`);
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
    console.error(
      "Error procesando webhook de Enviopack:",
      err.response?.data || err.message,
    );
  }
}

export async function getShippingCost(req, res) {
  try {
    const { provincia, codigo_postal, peso, paquetes } = req.query;

    const cotizaciones = await cotizarCosto({
      provincia,
      codigo_postal: Number(codigo_postal),
      peso: Number(peso),
      paquetes,
    });

    res.json(cotizaciones);
  } catch (err) {
    console.error("Enviopack error:", err.response?.data || err.message);
    res.status(500).json({ err: "No se pudo obtener el costo de envío" });
  }
}

export async function getShippingCondiciones(req, res) {
  try {
    const data = await getCondiciones();
    res.json(data);
  } catch (err) {
    console.error("Enviopack error:", err.response?.data || err.message);
    res.status(500).json({ error: "No se pudo obtener las condiciones" });
  }
}
export async function getShippingLabel(req, res) {
  try {
    const { envioId } = req.params;
    const { formato = "pdf", bulto } = req.query;

    const archivo = await getEtiqueta(Number(envioId), formato, bulto);

    res.set({
      "Content-Type": formato === "jpg" ? "image/jpeg" : "application/pdf",
      "Content-Disposition": `inline; filename="etiqueta-${envioId}.${formato}"`,
    });
    res.send(Buffer.from(archivo));
  } catch (err) {
    const detalle = err.response?.data
      ? Buffer.from(err.response.data).toString()
      : err.message;
    console.error("Enviopack error (etiqueta):", detalle);

    // Si el envío todavía no está "Procesado", Enviopack devuelve error acá
    res.status(err.response?.status || 500).json({
      error: "No se pudo obtener la etiqueta (¿el envío ya está en estado Procesado?)",
    });
  }
}