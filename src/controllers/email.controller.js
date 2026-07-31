import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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

    const response = await resend.emails.send({
      from: "BULONERA EL TRIÁNGULO <contacto@buloneraeltriangulo.com>",
      to: "eltrianguloventasonline@gmail.com",
      subject: `SOLICITUD DE COTIZACIÓN ${nombre}`,
      html: `
        <p><strong>Nombre:</strong> ${nombre}</p>
        <p><strong>Empresa:</strong> ${empresa}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Teléfono:</strong> ${telefono}</p>
        <p><strong>Mensaje:</strong> ${mensaje}</p>
      `,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    res.status(200).json({ message: "Email enviado correctamente" });
  } catch (error) {
    console.error("Error al enviar el email:", error);
    res.status(500).json({ message: "Error al enviar el email" });
  }
};
