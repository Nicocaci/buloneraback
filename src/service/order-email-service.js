import { resend } from "../config/resend-client.js";

export const BRAND = {
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

// WhatsApp de la tienda (el mismo de bulonerafront/src/utils/contacto.js)
const STORE_WHATSAPP = process.env.STORE_WHATSAPP || "5491151544062";

const DIRECCION_LOCAL = "Camino General Belgrano 6444, Gutiérrez";

const urlWhatsapp = (numero, mensaje) =>
  `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;

// Pasa un teléfono argentino escrito a mano al formato de WhatsApp (549 + área + número).
// Si no se puede interpretar con seguridad, devuelve null y el mail muestra solo el número.
export function telefonoParaWhatsapp(telefono = "") {
  let d = String(telefono).replace(/\D/g, "");
  if (d.startsWith("549") && d.length === 13) return d;
  if (d.startsWith("54") && d.length === 12) return `549${d.slice(2)}`;
  if (d.startsWith("0")) d = d.slice(1);
  // 10 dígitos que empiezan con 15: falta el código de área, no se puede armar
  if (d.length === 10 && !d.startsWith("15")) return `549${d}`;
  return null;
}

// entrega: { tipo: "retiro_local" } | { tipo: "envio", direccion: { calle, numero, pisoDepto,
// ciudad, provincia, codigoPostal, notas } } — la provincia ya viene con su nombre.
const escaparEntrega = (entrega) => {
  if (!entrega || entrega.tipo !== "envio") return entrega;
  const direccion = Object.fromEntries(
    Object.entries(entrega.direccion || {}).map(([k, v]) => [k, v ? escapeHtml(v) : ""]),
  );
  return { ...entrega, direccion };
};

// "Av. Siempre Viva 742, 3° B" — calle, número y piso/depto en una línea
const lineaCalle = (d = {}) =>
  `${d.calle || ""} ${d.numero || ""}`.trim() + (d.pisoDepto ? `, ${d.pisoDepto}` : "");

const lineaLocalidad = (d = {}) =>
  [d.ciudad, d.provincia].filter(Boolean).join(", ") +
  (d.codigoPostal ? ` (CP ${d.codigoPostal})` : "");

// Los datos que escribe el cliente (nombre, dirección) no pueden inyectar HTML en el mail.
const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Resend no lanza excepción si falla: devuelve { error }. Acá se convierte en excepción
// para que el error quede registrado en los logs.
async function enviar(payload) {
  const { data, error } = await resend.emails.send(payload);
  if (error) throw new Error(error.message || "Error de Resend");
  return data;
}

function buildOrderEmailHtml(datos) {
  return buildOrderEmailHtmlSeguro({
    ...datos,
    customerName: datos.customerName ? escapeHtml(datos.customerName) : datos.customerName,
    shippingMethod: datos.shippingMethod ? escapeHtml(datos.shippingMethod) : datos.shippingMethod,
    entrega: escaparEntrega(datos.entrega),
    items: escaparItems(datos.items),
  });
}

const escaparItems = (items = []) =>
  items.map((item) => ({
    ...item,
    product: { ...item.product, item: escapeHtml(item.product?.item) },
  }));

function buildOrderEmailHtmlSeguro({
  orderId,
  items,
  total,
  shippingCost = 0,
  customerName,
  paymentMethod = "Mercado Pago",
  shippingMethod = "-",
  entrega,
  orderDate = new Date().toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }),
}) {
  const shippingRowHtml =
    shippingCost > 0
      ? `
    <tr>
      <td colspan="3" style="padding:12px;border-bottom:1px solid ${BRAND.border};font-size:14px;color:${BRAND.black};font-weight:600;">
        Envío
      </td>
      <td style="padding:12px;border-bottom:1px solid ${BRAND.border};font-size:14px;color:${BRAND.black};text-align:right;font-weight:600;">
        $${shippingCost.toFixed(2)}
      </td>
    </tr>`
      : "";
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
        $${item.product.precioConIva.toFixed(2)}
      </td>
      <td style="padding:12px;border-bottom:1px solid ${BRAND.border};font-size:14px;color:${BRAND.black};text-align:right;font-weight:600;">
        $${(item.product.precioConIva * item.quantity).toFixed(2)}
      </td>
    </tr>`,
    )
    .join("");

  const esEnvio = entrega?.tipo === "envio";
  const d = entrega?.direccion || {};

  const mensajeWhatsapp = esEnvio
    ? `Hola! Mi pedido #${orderId} fue confirmado. Quiero coordinar el envío.`
    : `Hola! Mi pedido #${orderId} fue confirmado.`;
  const botonWhatsapp = `
      <a href="${urlWhatsapp(STORE_WHATSAPP, mensajeWhatsapp)}" style="display:inline-block;background-color:${BRAND.red};color:#ffffff;font-size:14px;font-weight:700;padding:13px 28px;border-radius:6px;text-decoration:none;">
        ${esEnvio ? "Coordinar envío por WhatsApp" : "Consultar pedido por WhatsApp"}
      </a>`;

  // Próximo paso: cómo sigue la entrega
  const entregaBlock = esEnvio
    ? `
    <tr>
      <td style="padding:26px 32px 0 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdecec;border-radius:8px;">
          <tr><td style="padding:18px 20px;">
            <div style="color:${BRAND.red};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px;">
              Próximo paso: coordinamos el envío
            </div>
            <p style="color:${BRAND.black};font-size:14px;line-height:22px;margin:0;">
              El total de este pedido no incluye el envío. Te pasamos el costo y el link de pago por WhatsApp.
            </p>
          </td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:22px 32px 0 32px;">
        <div style="color:${BRAND.black};font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;margin-bottom:10px;">
          Dirección de entrega
        </div>
        <p style="color:${BRAND.gray};font-size:14px;line-height:22px;margin:0;">
          ${customerName ? `${customerName}<br>` : ""}${lineaCalle(d)}<br>${lineaLocalidad(d)}${d.notas ? `<br><em>Notas: ${d.notas}</em>` : ""}
        </p>
      </td>
    </tr>`
    : `
    <tr>
      <td style="padding:26px 32px 0 32px;">
        <div style="color:${BRAND.black};font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;margin-bottom:10px;">
          Retiro en el local
        </div>
        <p style="color:${BRAND.gray};font-size:14px;line-height:22px;margin:0;">
          ${DIRECCION_LOCAL}. Te avisamos por email cuando esté listo para retirar.
        </p>
      </td>
    </tr>`;

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
              ${shippingRowHtml}
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

          ${entregaBlock}

          <!-- CTA -->
          <tr><td align="center" style="padding:26px 32px 0 32px;">
            ${botonWhatsapp}
          </td></tr>
          <tr><td align="center" style="padding:14px 32px 0 32px;">
            <a href="${STORE_URL}" style="color:${BRAND.gray};font-size:13px;text-decoration:underline;">
              Volver a la tienda
            </a>
          </td></tr>

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
  shippingCost = 0,
  customerName,
  paymentMethod,
  shippingMethod,
  entrega,
}) {
  await enviar({
    from: "BULONERA EL TRIÁNGULO <pedidos@buloneraeltriangulo.com>",
    to,
    subject: `Pedido confirmado #${orderId}`,
    html: buildOrderEmailHtml({
      orderId,
      items,
      total,
      shippingCost,
      customerName,
      paymentMethod,
      shippingMethod,
      entrega,
    }),
  });
}
function buildStoreNotificationHtml(datos) {
  return buildStoreNotificationHtmlSeguro({
    ...datos,
    customerName: datos.customerName ? escapeHtml(datos.customerName) : datos.customerName,
    customerEmail: datos.customerEmail ? escapeHtml(datos.customerEmail) : datos.customerEmail,
    customerPhone: datos.customerPhone ? escapeHtml(datos.customerPhone) : datos.customerPhone,
    whatsappCliente: telefonoParaWhatsapp(datos.customerPhone),
    shippingMethod: datos.shippingMethod ? escapeHtml(datos.shippingMethod) : datos.shippingMethod,
    entrega: escaparEntrega(datos.entrega),
    items: escaparItems(datos.items),
  });
}

function buildStoreNotificationHtmlSeguro({
  orderId,
  items,
  total,
  shippingCost = 0,
  customerName,
  customerEmail,
  customerPhone,
  whatsappCliente,
  shippingMethod,
  entrega,
  paymentMethod = "Mercado Pago",
  orderDate = new Date().toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }),
}) {
  const shippingRowHtml =
    shippingCost > 0
      ? `
    <tr>
      <td colspan="2" style="padding:10px;border-bottom:1px solid ${BRAND.border};font-size:14px;color:${BRAND.black};">
        Envío
      </td>
      <td style="padding:10px;border-bottom:1px solid ${BRAND.border};font-size:14px;text-align:right;font-weight:600;">
        $${shippingCost.toFixed(2)}
      </td>
    </tr>`
      : "";
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
        $${(item.product.precioConIva * item.quantity).toFixed(2)}
      </td>
    </tr>`,
    )
    .join("");

  const esEnvio = entrega?.tipo === "envio";
  const d = entrega?.direccion || {};

  const fila = (etiqueta, valor) => `
              <tr>
                <td style="padding:7px 10px;border-bottom:1px solid ${BRAND.border};font-size:13px;color:#8a8a92;width:130px;vertical-align:top;">${etiqueta}</td>
                <td style="padding:7px 10px;border-bottom:1px solid ${BRAND.border};font-size:14px;color:${BRAND.black};font-weight:600;">${valor || "-"}</td>
              </tr>`;

  const mensajeAlCliente = `Hola ${customerName || ""}! Te escribimos de Bulonera El Triángulo por tu pedido #${orderId}. Te pasamos el costo del envío:`;
  const botonWhatsappCliente = whatsappCliente
    ? `
            <a href="${urlWhatsapp(whatsappCliente, mensajeAlCliente)}" style="display:inline-block;background-color:${BRAND.red};color:#ffffff;font-size:13px;font-weight:700;padding:11px 22px;border-radius:6px;text-decoration:none;margin-top:12px;">
              Escribirle por WhatsApp
            </a>`
    : "";

  const envioBlock = esEnvio
    ? `
          <tr><td style="padding:18px 24px 0 24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdecec;border-radius:8px;">
              <tr><td style="padding:14px 16px;">
                <div style="color:${BRAND.red};font-size:12px;font-weight:700;text-transform:uppercase;">Envío a coordinar</div>
                <p style="color:${BRAND.black};font-size:14px;line-height:21px;margin:4px 0 0 0;">
                  El cliente pagó solo los productos. Pasale el costo del envío y el link de pago por WhatsApp.
                </p>
                ${botonWhatsappCliente}
              </td></tr>
            </table>
          </td></tr>

          <tr><td style="padding:18px 24px 0 24px;">
            <div style="color:${BRAND.black};font-size:13px;font-weight:700;text-transform:uppercase;margin-bottom:8px;">
              Datos para el envío
            </div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${fila("Destinatario", customerName)}
              ${fila("Teléfono", customerPhone)}
              ${fila("Calle y número", `${d.calle || ""} ${d.numero || ""}`.trim())}
              ${fila("Piso / Depto", d.pisoDepto)}
              ${fila("Localidad", d.ciudad)}
              ${fila("Provincia", d.provincia)}
              ${fila("Código postal", d.codigoPostal)}
              ${fila("Notas", d.notas)}
            </table>
          </td></tr>`
    : `
          <tr><td style="padding:18px 24px 0 24px;">
            <div style="color:${BRAND.black};font-size:13px;font-weight:700;text-transform:uppercase;margin-bottom:8px;">
              Entrega
            </div>
            <p style="color:${BRAND.gray};font-size:14px;line-height:22px;margin:0;">
              ${shippingMethod || "Retiro en el local"}
            </p>
          </td></tr>`;

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

          ${envioBlock}

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
              ${shippingRowHtml}
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
  shippingCost = 0,
  customerName,
  customerEmail,
  customerPhone,
  shippingMethod,
  entrega,
  paymentMethod,
}) {
  const sufijo = entrega?.tipo === "envio" ? " — Envío a coordinar" : " — Retiro en el local";
  await enviar({
    from: "BULONERA EL TRIÁNGULO <pedidos@buloneraeltriangulo.com>",
    to: process.env.STORE_NOTIFICATION_EMAIL,
    subject: `🛒 Nueva venta #${orderId} — ${customerName || "Cliente"}${sufijo}`,
    html: buildStoreNotificationHtml({
      orderId,
      items,
      total,
      shippingCost,
      customerName,
      customerEmail,
      customerPhone,
      shippingMethod,
      entrega,
      paymentMethod,
    }),
  });
}

// Aviso interno cuando una orden necesita revisión manual
// (monto distinto al de la orden, pago aprobado sin stock, reembolso, reclamo).
export async function sendStoreAlertEmail({ orderNumber, motivo }) {
  await enviar({
    from: "BULONERA EL TRIÁNGULO <pedidos@buloneraeltriangulo.com>",
    to: process.env.STORE_NOTIFICATION_EMAIL,
    subject: `⚠️ Revisar pedido #${orderNumber}`,
    html: `
  <div style="font-family:'Segoe UI',Arial,Helvetica,sans-serif;padding:20px;background:#f2f2f2;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;">
      <div style="background-color:${BRAND.black};padding:18px 24px;">
        <span style="color:#fff;font-size:15px;font-weight:700;">Pedido #${orderNumber} — requiere revisión</span>
      </div>
      <div style="height:4px;background-color:${BRAND.red};"></div>
      <p style="padding:20px 24px;margin:0;color:${BRAND.black};font-size:14px;line-height:22px;">
        ${escapeHtml(motivo)}
      </p>
      <p style="padding:0 24px 24px 24px;margin:0;color:${BRAND.gray};font-size:13px;">
        Revisalo en el panel de administración y en tu cuenta de Mercado Pago.
      </p>
    </div>
  </div>`,
  });
}
