import {
  cotizarADomicilio,
  cotizarASucursal,
  cotizarCosto,
  crearPedido,
  crearEnvio,
  getTracking,
} from "../service/enviopack/shipping.js";
import OrderModel from "../dao/models/order-model.js";

export async function getShippingOptions(req, res) {
  try {
    const { provincia, codigo_postal, peso, paquetes, localidad } = req.query;

    const [aDomicilio, aSucursal] = await Promise.all([
      cotizarADomicilio({
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
    console.log("aDomicilio:", JSON.stringify(aDomicilio));
    console.log("aSucursal:", JSON.stringify(aSucursal));
    const options = [
      ...aDomicilio.map((o) => ({
        tipo: "domicilio",
        modalidad: o.modalidad,
        servicio: o.servicio,
        valor: o.valor,
        horas_entrega: o.horas_entrega,
      })),
      ...aSucursal.map((o) => ({
        tipo: "sucursal",
        correo: o.sucursal.correo.id,
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
    });

    const esSucursal = shippingChoice.tipo === "sucursal";

    const envio = await crearEnvio({
      pedido: pedido.id,
      direccion_envio: Number(process.env.ENVIOPACK_DIRECCION_ENVIO),
      destinatario: `${orderData.nombre} ${orderData.apellido}`,
      modalidad: shippingChoice.modalidad,
      // clave: para domicilio no forzamos correo/servicio del quote de precio
      correo: esSucursal ? shippingChoice.correo : null,
      servicio: esSucursal ? shippingChoice.servicio : null,
      confirmado: true,
      calle: orderData.calle,
      numero: orderData.numero,
      codigo_postal: orderData.codigo_postal,
      provincia: orderData.provincia,
      paquetes: orderData.paquetes,
    });

    res.json({ pedido, envio });
  } catch (err) {
    console.error(err.response?.data || err.message);
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
  const { evento, envio } = req.body;
  if (evento === "envio-cambio-condicion") {
    const orderId = envio?.pedido?.id_externo;
    const condicion = String(
      envio?.condicion?.nombre ?? envio?.condicion ?? "",
    ).toLowerCase();
    const status = condicion.includes("entreg")
      ? "entregado"
      : condicion.includes("cancel")
        ? "cancelado"
        : "enviado";

    if (orderId) {
      await OrderModel.findByIdAndUpdate(orderId, { status });
    }
    console.log("Actualización de envío:", envio);
  }
  res.sendStatus(200);
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
