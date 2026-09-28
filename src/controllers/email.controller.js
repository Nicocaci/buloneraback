import { sendQuoteEmail } from "../service/cotizacion-email-service.js";

export const sendEmail = async (req, res) => {
  try {
    const { nombre, empresa, email, telefono, mensaje } = req.body;

    if (!nombre || !email || !telefono || !mensaje) {
      return res
        .status(400)
        .json({ error: "Todos los campos son obligatorios" });
    }

    // req.files viene del middleware de multer
    const attachments = (req.files || []).map((file) => ({
      filename: file.originalname,
      content: file.buffer,
    }));

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
    console.error("Error al enviar el email:", error);
    res.status(500).json({ message: "Error al enviar el email" });
  }
};