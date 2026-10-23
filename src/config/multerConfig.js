import multer from "multer";
import path from "path";
import AppError from "../utils/app-error.js";

const storage = multer.memoryStorage(); // ← sin disco, sin carpeta

const MB = 1024 * 1024;

const PRODUCT_IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

// Documentos permitidos en el formulario de contacto (además de cualquier imagen).
const CONTACT_DOC_EXTENSIONS = [".pdf", ".doc", ".docx", ".xls", ".xlsx"];

const productImageFilter = (req, file, cb) => {
  if (PRODUCT_IMAGE_MIMES.includes(file.mimetype)) return cb(null, true);
  return cb(
    new AppError(400, "Solo se permiten imágenes JPG, PNG, WEBP, AVIF o GIF"),
  );
};

const contactFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (file.mimetype.startsWith("image/") || CONTACT_DOC_EXTENSIONS.includes(ext)) {
    return cb(null, true);
  }
  return cb(
    new AppError(400, "Formato de archivo no permitido. Usá PDF, Word, Excel o imágenes."),
  );
};

// Imágenes de productos (panel admin): hasta 10 imágenes de 8 MB.
export const uploadProductImages = multer({
  storage,
  limits: { fileSize: 8 * MB, files: 10 },
  fileFilter: productImageFilter,
});

// Adjuntos del formulario de contacto: hasta 5 archivos de 7 MB
// (el total queda por debajo del límite de adjuntos de un email).
export const uploadContactFiles = multer({
  storage,
  limits: { fileSize: 7 * MB, files: 5 },
  fileFilter: contactFileFilter,
});

export default uploadProductImages;
