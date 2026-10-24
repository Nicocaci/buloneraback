// Arma una orden a partir de lo que manda el checkout, recalculando TODO en el servidor:
// precios (con ofertas vigentes), stock y costo de envío. Del navegador solo se toman
// los IDs de producto, las cantidades, los datos del comprador y la opción de envío elegida.
import mongoose from "mongoose";
import ProductModel, { calcularPrecioFinal } from "../../dao/models/product-model.js";
import CartModel from "../../dao/models/cart-model.js";
import AppError from "../../utils/app-error.js";
import {
  clean,
  isNonEmpty,
  isOptional,
  isValidEmail,
  isValidPhone,
  isValidObjectId,
} from "../../utils/validators.js";
import { obtenerOpcionesEnvio, esMismaOpcion } from "../enviopack/quote-service.js";

const MAX_ITEMS = 50;
const MAX_CANTIDAD = 999;

// Mismos valores que usa el frontend (utils/cartShipping.js) para cotizar.
const PESO_DEFAULT_KG = 1;
const PAQUETE_DEFAULT = "20x15x10";

const PROVINCIAS_VALIDAS = new Set("CBKHUXWEPYLFMNQRAJDZSGVT".split(""));

const redondear = (n) => Math.round(n * 100) / 100;

function validarItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError(400, "Tu carrito está vacío.");
  }
  if (items.length > MAX_ITEMS) {
    throw new AppError(400, "El carrito tiene demasiados productos.");
  }

  // Une líneas repetidas del mismo producto
  const cantidades = new Map();
  for (const item of items) {
    const productId = item?.productId;
    const quantity = Number(item?.quantity);
    if (!isValidObjectId(productId)) {
      throw new AppError(400, "Hay un producto inválido en el carrito.");
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_CANTIDAD) {
      throw new AppError(400, "Hay una cantidad inválida en el carrito.");
    }
    cantidades.set(productId, (cantidades.get(productId) || 0) + quantity);
  }
  return cantidades;
}

function validarComprador(comprador = {}) {
  const datos = {
    nombre: clean(comprador.nombre),
    apellido: clean(comprador.apellido),
    email: clean(comprador.email).toLowerCase(),
    telefono: clean(comprador.telefono),
  };
  if (!isNonEmpty(datos.nombre, 80) || !isNonEmpty(datos.apellido, 80)) {
    throw new AppError(400, "Completá tu nombre y apellido.");
  }
  if (!isValidEmail(datos.email)) {
    throw new AppError(400, "El email no es válido.");
  }
  if (!isValidPhone(datos.telefono)) {
    throw new AppError(400, "El teléfono no es válido.");
  }
  return datos;
}

function validarEnvio(envio = {}) {
  if (envio.metodo === "retiro_local") return { metodo: "retiro_local" };

  if (envio.metodo !== "envio") {
    throw new AppError(400, "Elegí un método de entrega.");
  }

  const datos = {
    metodo: "envio",
    calle: clean(envio.calle),
    numero: clean(envio.numero),
    ciudad: clean(envio.ciudad),
    provincia: clean(envio.provincia),
    codigoPostal: clean(envio.codigoPostal),
    notas: clean(envio.notas),
    opcion: envio.opcion,
  };

  if (
    !isNonEmpty(datos.calle, 120) ||
    !isNonEmpty(datos.numero, 20) ||
    !isNonEmpty(datos.ciudad, 100)
  ) {
    throw new AppError(400, "Completá la dirección de envío.");
  }
  if (!PROVINCIAS_VALIDAS.has(datos.provincia)) {
    throw new AppError(400, "La provincia no es válida.");
  }
  if (!/^\d{4,8}$/.test(datos.codigoPostal)) {
    throw new AppError(400, "El código postal no es válido.");
  }
  if (!isOptional(datos.notas, 500)) {
    throw new AppError(400, "Las notas de envío son demasiado largas.");
  }
  if (
    !datos.opcion ||
    typeof datos.opcion.correo !== "string" ||
    typeof datos.opcion.servicio !== "string" ||
    !["domicilio", "sucursal"].includes(datos.opcion.tipo)
  ) {
    throw new AppError(400, "Elegí una opción de envío.");
  }
  return datos;
}

async function cargarProductos(cantidades) {
  const ids = [...cantidades.keys()];
  const productos = await ProductModel.find({ _id: { $in: ids } }).lean();
  const porId = new Map(productos.map((p) => [String(p._id), p]));

  return ids.map((id) => {
    const producto = porId.get(id);
    const quantity = cantidades.get(id);

    if (!producto || producto.estado !== "activo") {
      throw new AppError(
        409,
        `Uno de los productos de tu carrito ya no está disponible${producto ? ` (${producto.item})` : ""}. Quitalo para continuar.`,
      );
    }
    if (producto.stock < quantity) {
      throw new AppError(
        409,
        producto.stock > 0
          ? `Stock insuficiente para "${producto.item}". Disponible: ${producto.stock}.`
          : `"${producto.item}" se quedó sin stock. Quitalo para continuar.`,
      );
    }

    return {
      product: producto._id,
      quantity,
      nombre: producto.item,
      sku: producto.sku,
      precioUnitario: calcularPrecioFinal(producto.precio, producto.iva, producto.oferta),
      pesoUnitario: producto.peso || PESO_DEFAULT_KG,
    };
  });
}

async function cotizarEnvio(envio, items) {
  const peso = items.reduce((acc, i) => acc + i.pesoUnitario * i.quantity, 0);
  const [alto, ancho, largo] = PAQUETE_DEFAULT.split("x").map(Number);

  let opciones;
  try {
    opciones = await obtenerOpcionesEnvio({
      provincia: envio.provincia,
      codigo_postal: envio.codigoPostal,
      peso,
      paquetes: PAQUETE_DEFAULT,
    });
  } catch (err) {
    console.error(
      "Enviopack error (checkout):",
      err.response?.status ?? "",
      err.response?.data ? JSON.stringify(err.response.data).slice(0, 300) : err.message,
    );
    throw new AppError(
      502,
      "No pudimos cotizar el envío en este momento. Probá de nuevo en unos minutos o elegí retiro en el local.",
    );
  }

  const elegida = opciones.find((o) => esMismaOpcion(o, envio.opcion));
  if (!elegida) {
    throw new AppError(
      409,
      "La opción de envío que elegiste ya no está disponible. Volvé al paso de envío y elegila de nuevo.",
    );
  }

  return {
    costo: redondear(Number(elegida.valor) || 0),
    opcion: {
      tipo: elegida.tipo,
      correo: elegida.correo,
      servicio: elegida.servicio,
      despacho: elegida.despacho,
      modalidad: elegida.modalidad,
      horasEntrega: elegida.horas_entrega,
    },
    paquetes: [{ alto, ancho, largo, peso }],
  };
}

// Devuelve los datos listos para OrderModel.create() con estado "pendiente_pago".
export async function prepararOrden({ body = {}, user }) {
  const cantidades = validarItems(body.items);
  const comprador = validarComprador(body.comprador);
  const envio = validarEnvio(body.envio);

  const items = await cargarProductos(cantidades);
  const subtotal = redondear(
    items.reduce((acc, i) => acc + i.precioUnitario * i.quantity, 0),
  );

  let envioCotizado = { costo: 0, opcion: null, paquetes: [] };
  if (envio.metodo === "envio") {
    envioCotizado = await cotizarEnvio(envio, items);
  }

  let cartId;
  if (user?.id && mongoose.isValidObjectId(user.id)) {
    const cart = await CartModel.findOne({ user: user.id }).select("_id").lean();
    cartId = cart?._id;
  }

  const esRetiro = envio.metodo === "retiro_local";

  return {
    user: user?.id || undefined,
    guestEmail: user?.id ? null : comprador.email,
    cart: cartId,
    comprador,
    products: items.map(({ pesoUnitario, ...item }) => item),
    subtotal,
    shippingCost: envioCotizado.costo,
    shippingMethod: esRetiro
      ? { tipo: "retiro_local", correo: null, servicio: "Retiro en local" }
      : {
          tipo: envioCotizado.opcion.tipo,
          correo: envioCotizado.opcion.correo,
          servicio: envioCotizado.opcion.servicio,
        },
    envio: {
      metodo: envio.metodo,
      opcion: envioCotizado.opcion || undefined,
      paquetes: envioCotizado.paquetes,
    },
    shippingAddress: esRetiro
      ? undefined
      : {
          calle: envio.calle,
          numero: envio.numero,
          ciudad: envio.ciudad,
          provincia: envio.provincia,
          codigoPostal: envio.codigoPostal,
          notas: envio.notas,
        },
    total: redondear(subtotal + envioCotizado.costo),
    status: "pendiente_pago",
    paymentMethod: "mercadopago",
  };
}

// Ítems para la preferencia de Mercado Pago, a partir de la orden ya calculada.
export function itemsParaMercadoPago(order) {
  const items = order.products.map((item) => ({
    id: item.sku || String(item.product),
    title: item.nombre,
    quantity: item.quantity,
    unit_price: item.precioUnitario,
    currency_id: "ARS",
  }));

  if (order.shippingCost > 0) {
    items.push({
      id: "envio",
      title: `Envío - ${order.shippingMethod?.correo || ""} (${order.shippingMethod?.servicio || ""})`,
      quantity: 1,
      unit_price: order.shippingCost,
      currency_id: "ARS",
    });
  }
  return items;
}
