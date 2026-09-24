import {
  MercadoPagoConfig,
  Preference,
  Payment,
  PaymentMethod,
} from "mercadopago";
import {
  sendOrderConfirmationEmail,
  sendStoreNotificationEmail,
} from "../service/order-email-service.js";
import { createEnviopackShipment } from "../service/enviopack/order-shipping-service.js";
import OrderModel from "../dao/models/order-model.js";
import OrderService from "../service/order-service.js";
import CartModel from "../dao/models/cart-model.js";
import ProductModel from "../dao/models/product-model.js";
import dotenv from "dotenv";
dotenv.config();

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

// 🔴 CONFIRMAR: este es el valor que devuelve tu backend de envíos
// para la opción de "retiro local". Lo saqué de tu chequeo de Enviopack
// (shippingChoice?.tipo !== "retiro_local"), pero no vi useShippingOptions.js
// para confirmarlo. Si el valor real es otro (ej: "retiro"), cambiar solo acá.
const TIPO_RETIRO_LOCAL = "retiro_local";

export const createOrder = async (req, res) => {
  try {
    const { cart, payer, shipping } = req.body;
    // shipping: { nombre, apellido, calle, numero, codigo_postal, provincia,
    //             localidad, paquetes, shippingChoice }

    if (!cart || !cart.products || cart.products.length === 0) {
      return res.status(400).json({ error: "Carrito vacío o inválido" });
    }
    if (!payer || !payer.email) {
      return res
        .status(400)
        .json({ error: "Email del pagador es obligatorio" });
    }
    if (!shipping || !shipping.shippingChoice) {
      return res.status(400).json({ error: "Datos de envío obligatorios" });
    }

    // Validar stock ANTES de generar el cobro
    for (const item of cart.products) {
      const productId = item.product?._id || item.product;
      const productDoc = await ProductModel.findById(productId);
      if (!productDoc || item.quantity > productDoc.stock) {
        return res.status(400).json({
          error: `Stock insuficiente para "${productDoc?.item || productId}"`,
        });
      }
    }

    const items = cart.products.map((item) => ({
      title: item.product.item,
      quantity: Number(item.quantity),
      unit_price: Number(item.product.precioConIva),
      currency_id: "ARS",
    }));

    // TEMP - PRUEBA SIN COSTO DE ENVÍO - REVERTIR DESPUÉS
     const shippingCost = Number(shipping.shippingChoice?.valor) || 0;
    //const shippingCost = 0;

    if (shippingCost > 0) {
      items.push({
        title: `Envío - ${shipping.shippingChoice?.correo || ""} (${shipping.shippingChoice?.servicio || ""})`,
        quantity: 1,
        unit_price: shippingCost,
        currency_id: "ARS",
      });
    }

    // Un invitado no tiene cart._id (viene de localStorage)
    const isGuest = !cart._id;
    const externalReference =
      cart._id || `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const body = {
      items,
      payer: { name: payer.name, surname: payer.surname, email: payer.email },
      payment_methods: {
        installments: 3,
        excluded_payment_types: [{ id: "ticket" }],
        excluded_payment_methods: [],
      },
      external_reference: externalReference,
      metadata: {
        cart_id: cart._id || undefined,
        guest: isGuest,
        products: isGuest
          ? JSON.stringify(
              cart.products.map((item) => ({
                product: item.product?._id || item.product,
                quantity: item.quantity,
              })),
            )
          : undefined,
        shipping: JSON.stringify(shipping),
      },
      notification_url:
        "https://buloneraback-production.up.railway.app/api/mp/webhook",
      back_urls: {
        success: "https://www.buloneraeltriangulo.com/gracias",
        failure: "https://www.buloneraeltriangulo.com",
        pending: "https://www.buloneraeltriangulo.com",
      },
      auto_return: "approved",
    };

    const preference = new Preference(client);
    const result = await preference.create({ body });

    res.json({ preferenceId: result.id, init_point: result.init_point });
  } catch (error) {
    console.error("=== ERROR CREANDO PREFERENCE ===", error);
    res.status(500).json({ error: error.message });
  }
};

export const mercadoPagoWebhook = async (req, res) => {
  try {
    const type = req.query.type || req.body.type;
    const paymentId = req.query["data.id"] || req.body?.data?.id;

    if (type === "payment") {
      const payment = await new Payment(client).get({ id: paymentId });

      if (payment.status === "approved") {
        const existingOrder = await OrderModel.findOne({
          paymentId: payment.id,
        });
        if (existingOrder) return res.sendStatus(200);

        const shipping = payment.metadata?.shipping
          ? JSON.parse(payment.metadata.shipping)
          : null;
        const shippingCost = Number(shipping?.shippingChoice?.valor) || 0;

        const isGuest =
          payment.metadata?.guest === "true" ||
          payment.metadata?.guest === true;

        let productsForOrder;
        let cartDoc = null;
        let userId = null;

        if (isGuest) {
          const guestItems = payment.metadata?.products
            ? JSON.parse(payment.metadata.products)
            : [];

          const productIds = guestItems.map((i) => i.product);
          const productDocs = await ProductModel.find({
            _id: { $in: productIds },
          });

          productsForOrder = guestItems.map((gi) => {
            const doc = productDocs.find(
              (d) => d._id.toString() === gi.product,
            );
            return { product: doc, quantity: gi.quantity };
          });
        } else {
          const cartId =
            payment.metadata?.cart_id || payment.external_reference;
          if (!cartId) return res.sendStatus(200);

          cartDoc =
            await CartModel.findById(cartId).populate("products.product");
          if (!cartDoc) return res.sendStatus(200);

          productsForOrder = cartDoc.products;
          userId = cartDoc.user;
        }

        const productsTotal = productsForOrder.reduce(
          (acc, item) => acc + item.product.precioConIva * item.quantity,
          0,
        );
        const total = productsTotal + shippingCost;

        const newOrder = await OrderService.createOrder({
          user: userId || undefined,
          guestEmail: isGuest ? payment.payer?.email : undefined,
          cart: cartDoc?._id,
          paymentId: payment.id,
          products: productsForOrder.map((item) => ({
            product: item.product._id,
            quantity: item.quantity,
          })),
          subtotal: productsTotal,
          shippingCost,
          shippingMethod: shipping?.shippingChoice
            ? {
                tipo: shipping.shippingChoice.tipo || null,
                correo: shipping.shippingChoice.correo || null,
                servicio: shipping.shippingChoice.servicio || null,
              }
            : null,
          shippingAddress: shipping
            ? {
                calle: shipping.calle,
                numero: shipping.numero,
                ciudad: shipping.localidad,
                provincia: shipping.provincia,
                codigoPostal: shipping.codigo_postal,
              }
            : null,
          total,
          paymentMethod: "mercadopago",
          status: "pagado",
        });

        // Solo vaciamos el carrito si existía uno de Mongo (usuario logueado)
        if (cartDoc) {
          cartDoc.products = [];
          await cartDoc.save();
        }

        const itemsForEmail = productsForOrder.map((item) => ({
          product: item.product,
          quantity: item.quantity,
        }));

        const esRetiroLocal =
          shipping?.shippingChoice?.tipo === TIPO_RETIRO_LOCAL;

        const shippingMethodLabel = shipping?.shippingChoice
          ? esRetiroLocal
            ? "Retiro local"
            : `${shipping.shippingChoice.tipo === "sucursal" ? "A sucursal" : "A domicilio"} — ${shipping.shippingChoice.correo || ""} (${shipping.shippingChoice.servicio || ""})`
          : undefined;

        const shippingAddressLabel = shipping
          ? `${shipping.calle} ${shipping.numero}, ${shipping.localidad}, ${shipping.provincia} (CP ${shipping.codigo_postal})`
          : undefined;

        // 📧 Mail al comprador
        sendOrderConfirmationEmail({
          to: payment.payer?.email,
          orderId: newOrder.orderNumber,
          items: itemsForEmail,
          total,
          customerName: payment.payer?.first_name,
          shippingMethod: shippingMethodLabel,
          shippingAddress: shippingAddressLabel,
        }).catch((err) => {
          console.error("Error enviando email de confirmación:", err);
        });

        // 📧 Notificación interna a la bulonera
        sendStoreNotificationEmail({
          orderId: newOrder.orderNumber,
          items: itemsForEmail,
          total,
          customerName:
            `${shipping?.nombre || payment.payer?.first_name || ""} ${shipping?.apellido || ""}`.trim(),
          customerEmail: payment.payer?.email,
          customerPhone: shipping?.telefono || payment.payer?.phone?.number || "",
          shippingAddress: shippingAddressLabel,
          shippingMethod: shippingMethodLabel,
          paymentMethod: "Mercado Pago",
        }).catch((err) => {
          console.error("Error enviando notificación a la tienda:", err);
        });

        // 🚚 Envío en Enviopack (se omite si es retiro local)
        if (shipping && !esRetiroLocal) {
          try {
            await createEnviopackShipment({
              orderId: newOrder._id,
              nombre: shipping.nombre,
              apellido: shipping.apellido,
              email: payment.payer?.email,
              monto: total,
              provincia: shipping.provincia,
              localidad: shipping.localidad,
              calle: shipping.calle,
              numero: shipping.numero,
              codigo_postal: shipping.codigo_postal,
              paquetes: shipping.paquetes,
              shippingChoice: shipping.shippingChoice,
            });
          } catch (err) {
            console.error(
              "Error creando envío Enviopack:",
              err.response?.data || err.message,
            );
          }
        } else if (!shipping) {
          console.warn(
            `Orden ${newOrder._id}: no llegó metadata.shipping, no se generó envío Enviopack`,
          );
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("=== ERROR WEBHOOK ===", error);
    res.sendStatus(500);
  }
};