// src/service/order-shipping-service.js
import { crearPedido, crearEnvio } from "./shipping.js";
import OrderModel from "../../dao/models/order-model.js";

// orderData: { orderId, nombre, apellido, email, monto, provincia, localidad,
//              calle, numero, codigo_postal, paquetes, shippingChoice }
export async function createEnviopackShipment(orderData) {
  const {
    orderId,
    nombre,
    apellido,
    email,
    monto,
    provincia,
    localidad,
    calle,
    numero,
    codigo_postal,
    paquetes,
    shippingChoice,
  } = orderData;

  const pedido = await crearPedido({
    id_externo: orderId,
    nombre,
    apellido,
    email,
    monto,
    fecha_alta: new Date().toISOString().slice(0, 19).replace("T", " "),
    pagado: true,
    provincia,
    localidad,
  });

  const envio = await crearEnvio({
    pedido: pedido.id,
    direccion_envio: Number(process.env.ENVIOPACK_DIRECCION_ENVIO),
    destinatario: `${nombre} ${apellido}`,
    despacho: shippingChoice.despacho,
    modalidad: shippingChoice.modalidad,
    correo: shippingChoice.correo,
    servicio: shippingChoice.servicio,
    confirmado: true,
    calle,
    numero,
    codigo_postal,
    provincia,
    localidad,
    paquetes,
  });

  await OrderModel.findByIdAndUpdate(orderId, {
    "enviopack.pedidoId": pedido.id,
    "enviopack.envioId": envio.id,
  });

  return { pedido, envio };
}