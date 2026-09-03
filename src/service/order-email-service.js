import { resend } from "../config/resend-client.js";

function buildOrderEmailHtml({ orderId, items, total, customerName }) {
  const itemsHtml = items
    .map(
      (item) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee;">${item.product.item}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">$${item.product.precio.toFixed(2)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">$${(item.product.precio * item.quantity).toFixed(2)}</td>
    </tr>`
    )
    .join("");

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      <h2>¡Gracias por tu compra${customerName ? `, ${customerName}` : ""}!</h2>
      <p>Tu pedido <strong>#${orderId}</strong> fue confirmado.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
        <thead>
          <tr style="background:#f4f4f4;">
            <th style="padding:8px;text-align:left;">Producto</th>
            <th style="padding:8px;">Cant.</th>
            <th style="padding:8px;text-align:right;">Precio</th>
            <th style="padding:8px;text-align:right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <p style="text-align:right;font-size:16px;"><strong>Total: $${total.toFixed(2)}</strong></p>
    </div>
  `;
}

export  async function sendOrderConfirmationEmail({ to, orderId, items, total, customerName }) {
  await resend.emails.send({
    from: "BULONERA EL TRIÁNGULO <pedidos@buloneraeltriangulo.com>", // mismo dominio verificado que ya usás
    to,
    subject: `Pedido confirmado #${orderId}`,
    html: buildOrderEmailHtml({ orderId, items, total, customerName }),
  });
}