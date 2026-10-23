import { sendQuoteEmail } from "../service/cotizacion-email-service.js";
import {
  clean,
  isNonEmpty,
  isOptional,
  isValidEmail,
  isValidPhone,
} from "../utils/validators.js";

export const sendEmail = async (req, res) => {
  const nombre = clean(req.body.nombre);
  const empresa = clean(req.body.empresa);
  const email = clean(req.body.email);
  const telefono = clean(req.body.telefono);
  const mensaje = clean(req.body.mensaje);

  if (!nombre || !email || !telefono || !mensaje) {
    return res
      .status(400)
      .json({ message: "Completá nombre, email, teléfono y el detalle de tu consulta." });
  }
  if (!isNonEmpty(nombre, 100) || !isOptional(empresa, 150)) {
    return res.status(400).json({ message: "El nombre o la empresa son demasiado largos." });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: "El email no es válido." });
  }
  if (!isValidPhone(telefono)) {
    return res.status(400).json({ message: "El teléfono no es válido." });
  }
  if (!isNonEmpty(mensaje, 5000)) {
    return res.status(400).json({ message: "El mensaje es demasiado largo (máximo 5000 caracteres)." });
  }

  // req.files viene del middleware de multer (con límites de tamaño, cantidad y tipo)
  const attachments = (req.files || []).map((file) => ({
    filename: file.originalname,
    content: file.buffer,
  }));

  try {
    await sendQuoteEmail({
      nombre,
      empresa,
      email,
      telefono,
      mensaje,
      attachments,
    });

    res.status(200).json({ message: "Email enviado correctamente" });
  } catch (error) {
    console.error("Error al enviar el email de cotización:", error.message);
    res.status(502).json({
      message: "No pudimos enviar tu consulta. Probá de nuevo o escribinos por WhatsApp.",
    });
  }
};
