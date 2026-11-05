// Arma una orden a partir de lo que manda el checkout, recalculando TODO en el servidor:
// precios (con ofertas vigentes) y stock. Del navegador solo se toman los IDs de producto,
// las cantidades, los datos del comprador y la dirección de entrega.
//
// Envío a domicilio: el costo NO se cobra en Mercado Pago. Se coordina por WhatsApp
// después de la compra (la tienda le pasa al cliente el costo y un link de pago aparte).
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
import { PROVINCIAS } from "../../utils/provincias.js";

const MAX_ITEMS = 50;
const MAX_CANTIDAD = 999;

// Texto con el que se guarda y se muestra el método de envío a domicilio
export const SERVICIO_ENVIO_A_COORDINAR = "A coordinar por WhatsApp";

const PROVINCIAS_VALIDAS = new Set(Object.keys(PROVINCIAS));

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
    pisoDepto: clean(envio.pisoDepto),
    ciudad: clean(envio.ciudad),
    provincia: clean(envio.provincia),
    codigoPostal: clean(envio.codigoPostal),
    notas: clean(envio.notas),
  };

  if (
    !isNonEmpty(datos.calle, 120) ||
    !isNonEmpty(datos.numero, 20) ||
    !isNonEmpty(datos.ciudad, 100)
  ) {
    throw new AppError(400, "Completá la dirección de envío.");
  }
  if (!isOptional(datos.pisoDepto, 40)) {
    throw new AppError(400, "El piso o departamento es demasiado largo.");
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
    };
  });
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
    products: items,
    subtotal,
    // El envío a domicilio se cobra aparte (se coordina por WhatsApp)
    shippingCost: 0,
    shippingMethod: esRetiro
      ? { tipo: "retiro_local", correo: null, servicio: "Retiro en local" }
      : { tipo: "domicilio", correo: null, servicio: SERVICIO_ENVIO_A_COORDINAR },
    envio: { metodo: envio.metodo },
    shippingAddress: esRetiro
      ? undefined
      : {
          calle: envio.calle,
          numero: envio.numero,
          pisoDepto: envio.pisoDepto,
          ciudad: envio.ciudad,
          provincia: envio.provincia,
          codigoPostal: envio.codigoPostal,
          notas: envio.notas,
        },
    total: subtotal,
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

  // Hoy el envío no se cobra en Mercado Pago (shippingCost = 0). Queda preparado para
  // cuando se cargue un costo de envío en la orden (tarifas por zona).
  if (order.shippingCost > 0) {
    items.push({
      id: "envio",
      title: "Envío a domicilio",
      quantity: 1,
      unit_price: order.shippingCost,
      currency_id: "ARS",
    });
  }
  return items;
}
