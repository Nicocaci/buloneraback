import "dotenv/config";
import {
  sendOrderConfirmationEmail,
  sendStoreNotificationEmail,
} from "../service/order-email-service.js"; // 👈 ojo con la ruta relativa, ahora es ../ en vez de ./

const items = [
  {
    product: { item: "Tornillo Allen M8x40", precio: 150 },
    quantity: 10,
  },
  {
    product: { item: "Arandela Presión 1/4", precio: 20 },
    quantity: 50,
  },
];

const total = items.reduce((acc, i) => acc + i.product.precio * i.quantity, 0);

const shippingMethod = "A domicilio — Correo Argentino (Expreso)";
const shippingAddress = "Av. Corrientes 1234, Rosario, Santa Fe (CP 2000)";

async function run() {
  // 1️⃣ Mail al comprador
  try {
    await sendOrderConfirmationEmail({
      to: "nicko.caci@gmail.com",
      orderId: "TEST123",
      items,
      total,
      customerName: "Juan Pérez",
      shippingMethod,
      shippingAddress,
    });
    console.log("✅ Mail al comprador enviado, revisá tu bandeja");
  } catch (err) {
    console.error("❌ Error en mail al comprador:", err);
  }

  // 2️⃣ Mail interno a la bulonera
  try {
    await sendStoreNotificationEmail({
      orderId: "TEST123",
      items,
      total,
      customerName: "Juan Pérez",
      customerEmail: "juan.perez@example.com",
      customerPhone: "+54 341 555-1234",
      shippingAddress,
      shippingMethod,
      paymentMethod: "Mercado Pago",
    });
    console.log(
      `✅ Mail interno enviado a ${process.env.STORE_NOTIFICATION_EMAIL || "(STORE_NOTIFICATION_EMAIL no seteado)"}`,
    );
  } catch (err) {
    console.error("❌ Error en mail interno:", err);
  }
}

run();