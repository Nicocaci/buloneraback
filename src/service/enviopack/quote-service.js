// Cotización de envíos en Enviopack.
// Lo usan el endpoint público de opciones (checkout) y, en la Fase 1B, el backend del pago
// para volver a cotizar y no confiar en el costo que manda el navegador.
import { cotizarCosto, cotizarASucursal } from "./shipping.js";

// 👇 Correos habilitados para envío a domicilio en tu cuenta.
// Tu cuenta usa Distribución Unificada, así que por ahora solo "enviopack"
// está realmente activo (confirmado en app.enviopack.com/configuracion/distribucion).
// Si en el futuro activás carriers individuales para domicilio, sumalos acá.
export const CORREOS_HABILITADOS = ["enviopack", "oca", "urbano"];

// 👇 Se usa despacho "S" (vos llevás el paquete a la sucursal del correo, más barato).
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

// ─── Caché de cotizaciones ──────────────────────────────────
// La misma cotización (provincia + CP + peso + paquetes) se reutiliza 10 minutos:
// el checkout cotiza al elegir el envío y el backend vuelve a cotizar al generar el pago.
// Si llegan dos pedidos iguales a la vez, comparten la misma consulta a Enviopack.
// Los errores no se guardan.
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 500;
const cacheCotizaciones = new Map(); // clave → { expira, promesa }

const claveCotizacion = ({ provincia, codigo_postal, peso, paquetes, localidad }) =>
  JSON.stringify([provincia, String(codigo_postal), Number(peso), paquetes, localidad || ""]);

export async function obtenerOpcionesEnvio(params) {
  const clave = claveCotizacion(params);
  const ahora = Date.now();
  const guardada = cacheCotizaciones.get(clave);
  if (guardada && guardada.expira > ahora) return guardada.promesa;

  const promesa = cotizarOpcionesEnvio(params);
  cacheCotizaciones.set(clave, { expira: ahora + CACHE_TTL_MS, promesa });
  promesa.catch(() => {
    if (cacheCotizaciones.get(clave)?.promesa === promesa) cacheCotizaciones.delete(clave);
  });

  // Tope de tamaño: se descarta la entrada más vieja
  if (cacheCotizaciones.size > CACHE_MAX) {
    cacheCotizaciones.delete(cacheCotizaciones.keys().next().value);
  }
  return promesa;
}

// params: { provincia, codigo_postal, peso, paquetes, localidad? }
async function cotizarOpcionesEnvio({
  provincia,
  codigo_postal,
  peso,
  paquetes,
  localidad,
}) {
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

  // 1. Filtrar por modalidad domicilio + correos habilitados
  // 2. Filtrar por tipo de despacho
  // 3. Quedarnos con la más barata por correo+servicio
  const domicilioFiltrado = dedupeCheapestByCorreo(
    filtrarPorDespacho(
      aDomicilio.filter(
        (o) => o.modalidad === "D" && CORREOS_HABILITADOS.includes(o.correo?.id),
      ),
    ),
  );

  return [
    ...domicilioFiltrado.map((o) => ({
      tipo: "domicilio",
      correo: o.correo?.id,
      despacho: o.despacho,
      modalidad: o.modalidad,
      servicio: o.servicio,
      valor: o.valor,
      horas_entrega: o.horas_entrega,
    })),
    ...aSucursal.map((o) => ({
      tipo: "sucursal",
      correo: o.sucursal.correo.id,
      despacho: o.despacho,
      modalidad: o.modalidad,
      servicio: o.servicio,
      valor: o.valor,
      horas_entrega: o.horas_entrega,
      sucursal: o.sucursal,
    })),
  ];
}

// Compara la opción que eligió el cliente contra una opción cotizada por el servidor.
export function esMismaOpcion(cotizada, elegida) {
  if (!cotizada || !elegida) return false;
  if (cotizada.tipo !== elegida.tipo) return false;
  if (String(cotizada.correo) !== String(elegida.correo)) return false;
  if (String(cotizada.servicio) !== String(elegida.servicio)) return false;
  if (cotizada.tipo === "sucursal") {
    const idElegida = elegida.sucursalId ?? elegida.sucursal?.id;
    return String(cotizada.sucursal?.id) === String(idElegida);
  }
  return true;
}

// Validación de los parámetros de cotización. Devuelve un mensaje de error o null.
export function validarParametrosCotizacion({
  provincia,
  codigo_postal,
  peso,
  paquetes,
  localidad,
}) {
  if (typeof provincia !== "string" || !/^[A-Z]$/.test(provincia)) {
    return "La provincia no es válida";
  }
  if (typeof codigo_postal !== "string" || !/^\d{4,8}$/.test(codigo_postal)) {
    return "El código postal no es válido";
  }
  const pesoNum = Number(peso);
  if (!Number.isFinite(pesoNum) || pesoNum <= 0 || pesoNum > 1000) {
    return "El peso no es válido";
  }
  if (typeof paquetes !== "string" || !/^\d{1,3}x\d{1,3}x\d{1,3}$/.test(paquetes)) {
    return "Las medidas del paquete no son válidas";
  }
  if (localidad !== undefined && localidad !== "" &&
      (typeof localidad !== "string" || !/^\d{1,10}$/.test(localidad))) {
    return "La localidad no es válida";
  }
  return null;
}
