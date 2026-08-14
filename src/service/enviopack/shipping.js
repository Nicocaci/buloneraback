// src/services/enviopack/shipping.js
import { enviopackRequest } from "./client.js";

// params: { provincia, codigo_postal, peso, paquetes }
export function cotizarADomicilio(params) {
  return enviopackRequest("GET", "/cotizar/precio/a-domicilio", {
    params: {
      ...params,
      direccion_envio: process.env.ENVIOPACK_DIRECCION_ENVIO,
    },
  });
}

// params: { provincia, localidad, peso, paquetes }
export function cotizarASucursal(params) {
  return enviopackRequest("GET", "/cotizar/precio/a-sucursal", {
    params: {
      ...params,
      direccion_envio: process.env.ENVIOPACK_DIRECCION_ENVIO,
    },
  });
}

export function crearPedido(pedido) {
  // pedido: { id_externo, nombre, apellido, email, monto, fecha_alta, pagado, provincia, localidad }
  return enviopackRequest("POST", "/pedidos", { data: pedido });
}

export function crearEnvio(envio) {
  console.log("Payload enviado a /envios:", JSON.stringify(envio, null, 2));
  // envio: { pedido, direccion_envio, destinatario, modalidad, correo, servicio,
  //          confirmado, calle, numero, piso, depto, codigo_postal, provincia,
  //          localidad, paquetes: [{alto, ancho, largo, peso}] }
  return enviopackRequest("POST", "/envios", { data: envio });
}

export function getTracking(envioId) {
  return enviopackRequest("GET", `/envios/${envioId}/tracking`, {
    params: { formato: "iso", orden: "desc" },
  });
}

// params: { provincia, codigo_postal, peso, paquetes }
export function cotizarCosto(params) {
  return enviopackRequest("GET", "/cotizar/costo", {
    params: {
      ...params,
      direccion_envio: process.env.ENVIOPACK_DIRECCION_ENVIO,
    },
  });
}
export function getEnvio(envioId) {
  return enviopackRequest("GET", `/envios/${envioId}`);
}
export function getCondiciones() {
  return enviopackRequest("GET", "/envios/condiciones");
}
