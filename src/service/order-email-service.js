import { resend } from "../config/resend-client.js";

const BRAND = {
  black: "#1f1e25",
  red: "#ff0405",
  gray: "#4b4b52",
  lightGray: "#f7f7f8",
  border: "#ececee",
};

// URL pública de tu logo (subilo a tu bucket/CDN, no sirve una ruta local).
// Usá la versión blanca del logo, porque el header queda con fondo oscuro.
const LOGO_URL = process.env.EMAIL_LOGO_URL;

const STORE_URL = process.env.STORE_URL ?? "https://buloneraeltriangulo.com";

function buildOrderEmailHtml({
  orderId,
  items,
  total,
  customerName,
  paymentMethod = "Mercado Pago",
  shippingMethod = "Enviopack",
  shippingAddress, // string opcional, ej: "Av. Rivadavia 4520, Caballito, CABA"
  trackingUrl, // opcional, si ya tenés el link de Enviopack
  orderDate = new Date().toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }),
}) {
  const itemsHtml = items
    .map(
      (item) => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid ${BRAND.border};font-size:14px;color:${BRAND.black};font-weight:600;">
        ${item.product.item}
      </td>
      <td style="padding:12px;border-bottom:1px solid ${BRAND.border};font-size:14px;color:${BRAND.black};text-align:right;">
        ${item.quantity}
      </td>
      <td style="padding:12px;border-bottom:1px solid ${BRAND.border};font-size:14px;color:${BRAND.black};text-align:right;">
        $${item.product.precio.toFixed(2)}
      </td>
      <td style="padding:12px;border-bottom:1px solid ${BRAND.border};font-size:14px;color:${BRAND.black};text-align:right;font-weight:600;">
        $${(item.product.precio * item.quantity).toFixed(2)}
      </td>
    </tr>`,
    )
    .join("");

  const trackingBlock = trackingUrl
    ? `
      <a href="${trackingUrl}" style="display:inline-block;background:#ffffff;color:${BRAND.black};font-size:13px;font-weight:700;padding:11px 24px;border-radius:6px;border:1.5px solid ${BRAND.black};text-decoration:none;">
        Rastrear envío
      </a>`
    : "";

  const shippingBlock = shippingAddress
    ? `
    <tr>
      <td style="padding:22px 32px 0 32px;">
        <div style="color:${BRAND.black};font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;margin-bottom:10px;">
          Dirección de envío
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td valign="top">
              <p style="color:${BRAND.gray};font-size:14px;line-height:22px;margin:0;">
                ${customerName ? `${customerName}<br>` : ""}${shippingAddress}
              </p>
            </td>
            <td valign="top" align="right">${trackingBlock}</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr><td style="padding:22px 32px 0 32px;"><div style="border-top:1px solid ${BRAND.border};">&nbsp;</div></td></tr>`
    : "";

  return `
  <div style="background-color:#f2f2f2;padding:24px 0;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;">

          <!-- HEADER -->
          <tr><td style="background-color:${BRAND.black};padding:28px 32px;text-align:center;">
            <img src="${LOGO_URL}" width="180" alt="Bulonera El Triángulo" style="margin:0 auto;border:0;display:block;">
          </td></tr>
          <tr><td style="height:4px;line-height:4px;font-size:0;background-color:${BRAND.red};">&nbsp;</td></tr>

          <!-- SALUDO -->
          <tr><td style="padding:32px 32px 8px 32px;">
            <span style="display:inline-block;background:#fdecec;color:${BRAND.red};font-size:12px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;padding:6px 14px;border-radius:20px;margin-bottom:14px;">
              Pedido confirmado
            </span>
            <h2 style="color:${BRAND.black};font-size:22px;margin:0 0 10px 0;">
              ¡Gracias por tu compra${customerName ? `, ${customerName}` : ""}!
            </h2>
            <p style="color:${BRAND.gray};font-size:14px;line-height:22px;margin:0;">
              Recibimos tu pedido <strong style="color:${BRAND.black};">#${orderId}</strong> y ya lo estamos preparando.
            </p>
          </td></tr>

          <!-- INFO -->
          <tr><td style="padding:22px 32px 0 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="33%" style="padding-right:6px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.lightGray};border-radius:8px;">
                    <tr><td style="padding:14px 16px;">
                      <div style="color:#8a8a92;font-size:11px;text-transform:uppercase;">Fecha</div>
                      <div style="color:${BRAND.black};font-size:14px;font-weight:600;padding-top:2px;">${orderDate}</div>
                    </td></tr>
                  </table>
                </td>
                <td width="33%" style="padding:0 6px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.lightGray};border-radius:8px;">
                    <tr><td style="padding:14px 16px;">
                      <div style="color:#8a8a92;font-size:11px;text-transform:uppercase;">Pago</div>
                      <div style="color:${BRAND.black};font-size:14px;font-weight:600;padding-top:2px;">${paymentMethod}</div>
                    </td></tr>
                  </table>
                </td>
                <td width="33%" style="padding-left:6px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.lightGray};border-radius:8px;">
                    <tr><td style="padding:14px 16px;">
                      <div style="color:#8a8a92;font-size:11px;text-transform:uppercase;">Envío</div>
                      <div style="color:${BRAND.black};font-size:14px;font-weight:600;padding-top:2px;">${shippingMethod}</div>
                    </td></tr>
                  </table>
                </td>
              </tr>
            </table>
          </td></tr>

          <!-- ITEMS -->
          <tr><td style="padding:28px 32px 0 32px;">
            <div style="color:${BRAND.black};font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;margin-bottom:12px;">
              Detalle del pedido
            </div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr style="background-color:${BRAND.black};">
                <th style="padding:10px 12px;text-align:left;color:#fff;font-size:11px;text-transform:uppercase;">Producto</th>
                <th style="padding:10px 12px;text-align:right;color:#fff;font-size:11px;text-transform:uppercase;">Cant.</th>
                <th style="padding:10px 12px;text-align:right;color:#fff;font-size:11px;text-transform:uppercase;">Precio</th>
                <th style="padding:10px 12px;text-align:right;color:#fff;font-size:11px;text-transform:uppercase;">Subtotal</th>
              </tr>
              ${itemsHtml}
            </table>
          </td></tr>

          <!-- TOTAL -->
          <tr><td style="padding:16px 32px 0 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="right" style="padding:10px 12px 0 12px;font-size:17px;font-weight:700;color:${BRAND.black};border-top:2px solid ${BRAND.black};">
                  Total:&nbsp; $${total.toFixed(2)}
                </td>
              </tr>
            </table>
          </td></tr>

          <!-- CTA -->
          <tr><td align="center" style="padding:26px 32px 8px 32px;">
            <a href="${STORE_URL}/gracias" style="display:inline-block;background-color:${BRAND.red};color:#ffffff;font-size:14px;font-weight:700;padding:13px 28px;border-radius:6px;text-decoration:none;">
              Volver a la tienda
            </a>
          </td></tr>

          ${shippingBlock}

          <!-- FOOTER -->
          <tr><td style="padding:26px 32px;text-align:center;">
            <p style="color:#9a9aa2;font-size:12px;line-height:19px;margin:0;">
              ¿Dudas con tu pedido? Escribinos a
              <a href="mailto:eltrianguloventasonline@gmail.com" style="color:#8a8a92;">eltrianguloventasonline@gmail.com</a>
            </p>
            <p style="color:#c4c4ca;font-size:12px;margin-top:14px;">
              © ${new Date().getFullYear()} Bulonera El Triángulo
            </p>
          </td></tr>

        </table>
      </td></tr>
    </table>
  </div>`;
}

export async function sendOrderConfirmationEmail({
  to,
  orderId,
  items,
  total,
  customerName,
  paymentMethod,
  shippingMethod,
  shippingAddress,
  trackingUrl,
}) {
  await resend.emails.send({
    from: "BULONERA EL TRIÁNGULO <pedidos@buloneraeltriangulo.com>",
    to,
    subject: `Pedido confirmado #${orderId}`,
    html: buildOrderEmailHtml({
      orderId,
      items,
      total,
      customerName,
      paymentMethod,
      shippingMethod,
      shippingAddress,
      trackingUrl,
    }),
  });
}
function buildStoreNotificationHtml({
  orderId,
  items,
  total,
  customerName,
  customerEmail,
  customerPhone,
  shippingAddress,
  shippingMethod,
  paymentMethod = "Mercado Pago",
  orderDate = new Date().toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }),
}) {
  const itemsHtml = items
    .map(
      (item) => `
    <tr>
      <td style="padding:10px;border-bottom:1px solid ${BRAND.border};font-size:14px;color:${BRAND.black};">
        ${item.product.item}
      </td>
      <td style="padding:10px;border-bottom:1px solid ${BRAND.border};font-size:14px;text-align:right;">
        ${item.quantity}
      </td>
      <td style="padding:10px;border-bottom:1px solid ${BRAND.border};font-size:14px;text-align:right;font-weight:600;">
        $${(item.product.precio * item.quantity).toFixed(2)}
      </td>
    </tr>`,
    )
    .join("");

  return `
  <div style="font-family:'Segoe UI',Arial,Helvetica,sans-serif;padding:20px;background:#f2f2f2;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;">

          <tr><td style="background-color:${BRAND.black};padding:18px 24px;">
            <span style="color:#fff;font-size:15px;font-weight:700;">Nueva venta — Pedido #${orderId}</span>
          </td></tr>

          <tr><td style="padding:20px 24px 0 24px;">
            <div style="color:${BRAND.black};font-size:13px;font-weight:700;text-transform:uppercase;margin-bottom:8px;">
              Comprador
            </div>
            <p style="color:${BRAND.gray};font-size:14px;line-height:22px;margin:0;">
              ${customerName || "-"}<br>
              ${customerEmail || "-"}<br>
              ${customerPhone || "-"}
            </p>
          </td></tr>

          <tr><td style="padding:18px 24px 0 24px;">
            <div style="color:${BRAND.black};font-size:13px;font-weight:700;text-transform:uppercase;margin-bottom:8px;">
              Envío
            </div>
            <p style="color:${BRAND.gray};font-size:14px;line-height:22px;margin:0;">
              ${shippingMethod || "-"}<br>
              ${shippingAddress || "Sin dirección"}
            </p>
          </td></tr>

          <tr><td style="padding:18px 24px 0 24px;">
            <div style="color:${BRAND.black};font-size:13px;font-weight:700;text-transform:uppercase;margin-bottom:8px;">
              Detalle
            </div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr style="background-color:${BRAND.black};">
                <th style="padding:8px 10px;text-align:left;color:#fff;font-size:11px;">Producto</th>
                <th style="padding:8px 10px;text-align:right;color:#fff;font-size:11px;">Cant.</th>
                <th style="padding:8px 10px;text-align:right;color:#fff;font-size:11px;">Subtotal</th>
              </tr>
              ${itemsHtml}
            </table>
          </td></tr>

          <tr><td style="padding:14px 24px 0 24px;">
            <p style="text-align:right;font-size:16px;font-weight:700;color:${BRAND.black};border-top:2px solid ${BRAND.black};padding-top:10px;margin:0;">
              Total: $${total.toFixed(2)}
            </p>
            <p style="text-align:right;font-size:12px;color:${BRAND.gray};margin:6px 0 0 0;">
              Pago: ${paymentMethod} · ${orderDate}
            </p>
          </td></tr>

          <tr><td style="padding:24px;"></td></tr>

        </table>
      </td></tr>
    </table>
  </div>`;
}

export async function sendStoreNotificationEmail({
  orderId,
  items,
  total,
  customerName,
  customerEmail,
  customerPhone,
  shippingAddress,
  shippingMethod,
  paymentMethod,
}) {
  await resend.emails.send({
    from: "BULONERA EL TRIÁNGULO <pedidos@buloneraeltriangulo.com>",
    to: process.env.STORE_NOTIFICATION_EMAIL,
    subject: `🛒 Nueva venta #${orderId} — ${customerName || "Cliente"}`,
    html: buildStoreNotificationHtml({
      orderId,
      items,
      total,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      shippingMethod,
      paymentMethod,
    }),
  });
}
