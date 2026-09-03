import {
  MercadoPagoConfig,
  Preference,
  Payment,
  PaymentMethod,
} from "mercadopago";
import { sendOrderConfirmationEmail } from "../service/order-email-service.js";
import { createEnviopackShipment } from "../service/enviopack/order-shipping-service.js";
import OrderModel from "../dao/models/order-model.js";
import CartModel from "../dao/models/cart-model.js";
import dotenv from "dotenv";
dotenv.config();

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

export const createOrder = async (req, res) => {
  try {
    const { cart, payer, shipping } = req.body;
    // shipping: { nombre, apellido, calle, numero, codigo_postal, provincia,
    //             localidad, paquetes, shippingChoice }

    if (!cart || !cart.products || cart.products.length === 0) {
      return res.status(400).json({ error: "Carrito vacío o inválido" });
    }
    if (!payer || !payer.email) {
      return res.status(400).json({ error: "Email del pagador es obligatorio" });
    }
    if (!shipping || !shipping.shippingChoice) {
      return res.status(400).json({ error: "Datos de envío obligatorios" });
    }

    const items = cart.products.map((item) => ({
      title: item.product.item,
      quantity: Number(item.quantity),
      unit_price: Number(item.product.precioConIva),
      currency_id: "ARS",
    }));

    const body = {
      items,
      payer: { name: payer.name, surname: payer.surname, email: payer.email },
      payment_methods: {
        installments: 3,
        excluded_payment_types: [{ id: "ticket" }],
        excluded_payment_methods: [],
      },
      external_reference: cart._id,
      metadata: {
        cart_id: cart._id,
        // 👇 lo guardamos como JSON string: MP no garantiza soporte
        // de objetos anidados en metadata para todos los campos
        shipping: JSON.stringify(shipping),
      },
      notification_url: "https://buloneraback-production.up.railway.app/api/mp/webhook",
      back_urls: {
        success: "https://www.buloneraeltriangulo.com/gracias",
        failure: "https://www.buloneraeltriangulo.com/error",
        pending: "https://www.buloneraeltriangulo.com/pendiente",
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
        const cartId = payment.metadata?.cart_id || payment.external_reference;
        if (!cartId) return res.sendStatus(200);

        const cart = await CartModel.findById(cartId).populate("products.product");
        if (!cart) return res.sendStatus(200);

        const existingOrder = await OrderModel.findOne({ paymentId: payment.id });
        if (existingOrder) return res.sendStatus(200);

        const total = cart.products.reduce(
          (acc, item) => acc + item.product.precio * item.quantity,
          0
        );

        const newOrder = new OrderModel({
          user: cart.user,
          cart: cart._id,
          paymentId: payment.id,
          products: cart.products,
          total,
          paymentMethod: "mercadopago",
          status: "pagado",
        });
        await newOrder.save();

        cart.products = [];
        await cart.save();

        // 📧 Email de confirmación (fix: itemsForEmail ahora sí existe)
        const itemsForEmail = newOrder.products.map((item) => ({
          product: item.product,
          quantity: item.quantity,
        }));

        sendOrderConfirmationEmail({
          to: payment.payer?.email,
          orderId: newOrder._id,
          items: itemsForEmail,
          total,
          customerName: payment.payer?.first_name,
        }).catch((err) => {
          console.error("Error enviando email de confirmación:", err);
        });

        // 🚚 Envío en Enviopack (fix: antes no se disparaba nunca para MP)
        if (payment.metadata?.shipping) {
          try {
            const shipping = JSON.parse(payment.metadata.shipping);
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
            console.log("Envío Enviopack creado para orden:", newOrder._id);
          } catch (err) {
            console.error(
              "Error creando envío Enviopack:",
              err.response?.data || err.message
            );
            // no relanzamos: el pago y la orden ya están confirmados,
            // esto se puede reintentar/resolver a mano si falla
          }
        } else {
          console.warn(
            `Orden ${newOrder._id}: no llegó metadata.shipping, no se generó envío Enviopack`
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