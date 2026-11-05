import "dotenv/config";
import {
  sendOrderConfirmationEmail,
  sendStoreNotificationEmail,
} from "../service/order-email-service.js";

const items = [
  {
    product: { item: "Tornillo Allen M8x40", precioConIva: 181.5 },
    quantity: 10,
  },
  {
    product: { item: "Arandela Presión 1/4", precioConIva: 24.2 },
    quantity: 50,
  },
];

// El envío a domicilio se coordina por WhatsApp: no se cobra en Mercado Pago
const shippingCost = 0;

const productsTotal = items.reduce(
  (acc, i) => acc + i.product.precioConIva * i.quantity,
  0,
);
const total = productsTotal + shippingCost;

const shippingMethod = "Envío a domicilio (a coordinar)";
const entrega = {
  tipo: "envio",
  direccion: {
    calle: "Av. Corrientes",
    numero: "1234",
    pisoDepto: "3° B",
    ciudad: "Rosario",
    provincia: "Santa Fe",
    codigoPostal: "2000",
    notas: "Tocar timbre 3B",
  },
};

async function run() {
  // 1️⃣ Mail al comprador
  try {
    await sendOrderConfirmationEmail({
      to: "nicko.caci@gmail.com",
      orderId: "TEST123",
      items,
      total,
      shippingCost,
      customerName: "Juan Pérez",
      shippingMethod,
      entrega,
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
      shippingCost,
      customerName: "Juan Pérez",
      customerEmail: "juan.perez@example.com",
      customerPhone: "+54 341 555-1234",
      shippingMethod,
      entrega,
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