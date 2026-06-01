import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import OrderModel from "../dao/models/order-model.js";
import CartModel from "../dao/models/cart-model.js";
import dotenv from "dotenv";
dotenv.config();

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

export const createOrder = async (req, res) => {
  try {
    const { cart, payer } = req.body;

    console.log("=== CREATE ORDER REQUEST ===");
    console.log("Cart ID:", cart?._id);
    console.log("Payer:", payer);

    // Validaciones fuertes
    if (!cart || !cart.products || cart.products.length === 0) {
      return res.status(400).json({ error: "Carrito vacío o inválido" });
    }

    if (!payer || !payer.email) {
      return res
        .status(400)
        .json({ error: "Email del pagador es obligatorio" });
    }

    const items = cart.products.map((item) => ({
      title: item.product.item,
      quantity: Number(item.quantity),
      unit_price: Number(item.product.precioConIva),
      currency_id: "ARS",
    }));

    const body = {
      items,

      payer: {
        name: payer.name,
        surname: payer.surname,
        email: payer.email,
      },

      external_reference: cart._id,

      metadata: {
        cart_id: cart._id,
      },

      notification_url:
        "https://buloneraback-production.up.railway.app/api/mp/webhook",

      back_urls: {
        success: "https://www.buloneraeltriangulo.com/gracias",
        failure: "https://www.buloneraeltriangulo.com/error",
        pending: "https://www.buloneraeltriangulo.com/pendiente",
      },

      auto_return: "approved",
    };

    console.log("=== BODY ENVIADO A MP ===");
    console.log(JSON.stringify(body, null, 2));
    const preference = new Preference(client);
    const result = await preference.create({ body });

    console.log("=== PREFERENCE CREADA ===");
    console.log("Preference ID:", result.id);
    console.log("Init Point:", result.init_point);
    console.log("Sandbox:", result.sandbox_init_point);

    res.json({
      preferenceId: result.id,
      init_point: result.init_point,
    });
  } catch (error) {
    console.error("=== ERROR CREANDO PREFERENCE ===");
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

export const mercadoPagoWebhook = async (req, res) => {
  try {
    console.log("=== WEBHOOK RECIBIDO ===");
    console.log("Query:", req.query);
    console.log("Body:", req.body);

    const type = req.query.type || req.body.type;

    const paymentId = req.query["data.id"] || req.body?.data?.id;

    if (type === "payment") {
      const payment = await new Payment(client).get({
        id: paymentId,
      });

      console.log("=== PAYMENT INFO ===");
      console.log(payment);

      if (payment.status === "approved") {
        const cartId = payment.metadata?.cart_id || payment.external_reference;

        console.log("Pago aprobado");
        console.log("Cart ID:", cartId);

        if (!cartId) {
          console.log("No existe cartId");
          return res.sendStatus(200);
        }

        const cart =
          await CartModel.findById(cartId).populate("products.product");

        if (!cart) {
          console.log("Carrito no encontrado");
          return res.sendStatus(200);
        }

        // evitar duplicados
        const existingOrder = await OrderModel.findOne({
          paymentId: payment.id,
        });

        if (existingOrder) {
          console.log("La orden ya existe");
          return res.sendStatus(200);
        }

        const total = cart.products.reduce((acc, item) => {
          return acc + item.product.precio * item.quantity;
        }, 0);

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

        console.log("Orden creada:", newOrder._id);

        // VACIAR CARRITO
        cart.products = [];

        await cart.save();

        console.log("Carrito vaciado");
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("=== ERROR WEBHOOK ===");
    console.error(error);

    res.sendStatus(500);
  }
};
