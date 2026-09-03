import "dotenv/config";
import { sendOrderConfirmationEmail } from "../service/order-email-service.js"; // 👈 ojo con la ruta relativa, ahora es ../ en vez de ./

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

sendOrderConfirmationEmail({
  to: "nicko.caci@gmail.com",
  orderId: "TEST123",
  items,
  total,
  customerName: "Juan Pérez",
})
  .then(() => console.log("✅ Email enviado, revisá tu bandeja"))
  .catch((err) => console.error("❌ Error:", err));