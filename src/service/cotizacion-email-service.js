import { resend } from "../config/resend-client.js";
import { BRAND } from "./order-email-service.js";

const LOGO_URL = process.env.EMAIL_LOGO_URL;

// Evita que lo que escribe el cliente rompa (o inyecte) HTML en el mail
const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const nl2br = (value = "") => escapeHtml(value).replace(/\r?\n/g, "<br>");

function buildQuoteEmailHtml({
  nombre,
  empresa,
  email,
  telefono,
  mensaje,
  attachmentNames = [],
  requestDate = new Date().toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  }),
}) {
  const safe = {
    nombre: escapeHtml(nombre),
    empresa: escapeHtml(empresa),
    email: escapeHtml(email),
    telefono: escapeHtml(telefono),
  };

  const row = (label, valueHtml) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${BRAND.border};width:110px;color:#8a8a92;font-size:11px;text-transform:uppercase;vertical-align:top;">
        ${label}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid ${BRAND.border};color:${BRAND.black};font-size:14px;font-weight:600;">
        ${valueHtml}
      </td>
    </tr>`;

  const empresaRow = empresa ? row("Empresa", safe.empresa) : "";

  const attachmentsBlock = attachmentNames.length
    ? `
    <tr><td style="padding:22px 32px 0 32px;">
      <div style="color:${BRAND.black};font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;margin-bottom:10px;">
        Archivos adjuntos
      </div>
      <p style="color:${BRAND.gray};font-size:14px;line-height:22px;margin:0;">
        ${attachmentNames.map((n) => `📎 ${escapeHtml(n)}`).join("<br>")}
      </p>
    </td></tr>`
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

          <!-- TÍTULO -->
          <tr><td style="padding:32px 32px 8px 32px;">
            <span style="display:inline-block;background:#fdecec;color:${BRAND.red};font-size:12px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;padding:6px 14px;border-radius:20px;margin-bottom:14px;">
              Nueva cotización
            </span>
            <h2 style="color:${BRAND.black};font-size:22px;margin:0 0 10px 0;">
              Solicitud de cotización de ${safe.nombre}
            </h2>
            <p style="color:${BRAND.gray};font-size:14px;line-height:22px;margin:0;">
              Recibiste una nueva consulta desde el formulario de la web.
            </p>
          </td></tr>

          <!-- INFO -->
          <tr><td style="padding:22px 32px 0 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="50%" style="padding-right:6px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.lightGray};border-radius:8px;">
                    <tr><td style="padding:14px 16px;">
                      <div style="color:#8a8a92;font-size:11px;text-transform:uppercase;">Fecha</div>
                      <div style="color:${BRAND.black};font-size:14px;font-weight:600;padding-top:2px;">${requestDate}</div>
                    </td></tr>
                  </table>
                </td>
                <td width="50%" style="padding-left:6px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.lightGray};border-radius:8px;">
                    <tr><td style="padding:14px 16px;">
                      <div style="color:#8a8a92;font-size:11px;text-transform:uppercase;">Adjuntos</div>
                      <div style="color:${BRAND.black};font-size:14px;font-weight:600;padding-top:2px;">${
                        attachmentNames.length
                          ? `${attachmentNames.length} archivo${attachmentNames.length > 1 ? "s" : ""}`
                          : "Sin adjuntos"
                      }</div>
                    </td></tr>
                  </table>
                </td>
              </tr>
            </table>
          </td></tr>

          <!-- DATOS DEL CLIENTE -->
          <tr><td style="padding:28px 32px 0 32px;">
            <div style="color:${BRAND.black};font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px;">
              Datos del cliente
            </div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${row("Nombre", safe.nombre)}
              ${empresaRow}
              ${row("Email", `<a href="mailto:${safe.email}" style="color:${BRAND.black};text-decoration:none;">${safe.email}</a>`)}
              ${row("Teléfono", `<a href="tel:${safe.telefono}" style="color:${BRAND.black};text-decoration:none;">${safe.telefono}</a>`)}
            </table>
          </td></tr>

          <!-- MENSAJE -->
          <tr><td style="padding:24px 32px 0 32px;">
            <div style="color:${BRAND.black};font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;margin-bottom:10px;">
              Mensaje
            </div>
            <div style="background:${BRAND.lightGray};border-left:4px solid ${BRAND.red};border-radius:6px;padding:16px 18px;color:${BRAND.black};font-size:14px;line-height:22px;">
              ${nl2br(mensaje)}
            </div>
          </td></tr>

          ${attachmentsBlock}

          <!-- CTA -->
          <tr><td align="center" style="padding:28px 32px 8px 32px;">
            <a href="mailto:${safe.email}?subject=${encodeURIComponent("Respuesta a tu solicitud de cotización")}" style="display:inline-block;background-color:${BRAND.red};color:#ffffff;font-size:14px;font-weight:700;padding:13px 28px;border-radius:6px;text-decoration:none;">
              Responder al cliente
            </a>
          </td></tr>

          <!-- FOOTER -->
          <tr><td style="padding:26px 32px;text-align:center;">
            <p style="color:#c4c4ca;font-size:12px;margin:0;">
              © ${new Date().getFullYear()} Bulonera El Triángulo
            </p>
          </td></tr>

        </table>
      </td></tr>
    </table>
  </div>`;
}

export async function sendQuoteEmail({
  nombre,
  empresa,
  email,
  telefono,
  mensaje,
  attachments = [],
}) {
  const { data, error } = await resend.emails.send({
    from: "BULONERA EL TRIÁNGULO <contacto@buloneraeltriangulo.com>",
    to: "eltrianguloventasonline@gmail.com",
    replyTo: email, // al tocar "Responder" en Gmail, le contestás directo al cliente
    subject: `SOLICITUD DE COTIZACIÓN ${nombre}`,
    html: buildQuoteEmailHtml({
      nombre,
      empresa,
      email,
      telefono,
      mensaje,
      attachmentNames: attachments.map((a) => a.filename),
    }),
    attachments: attachments.length > 0 ? attachments : undefined,
  });

  // Resend NO lanza excepción si falla: devuelve { error }
  if (error) throw new Error(error.message || "Error de Resend");

  return data;
}