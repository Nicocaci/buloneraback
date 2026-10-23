import multer from "multer";
import AppError from "../utils/app-error.js";

const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: "Uno de los archivos supera el tamaño máximo permitido",
  LIMIT_FILE_COUNT: "Superaste la cantidad máxima de archivos",
  LIMIT_UNEXPECTED_FILE: "Superaste la cantidad máxima de archivos",
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({ message: "Recurso no encontrado" });
};

// Manejo centralizado: nunca se devuelve el mensaje interno ni el stack de un error inesperado.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err instanceof AppError) {
    return res.status(err.status).json({ message: err.message });
  }

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      message: MULTER_MESSAGES[err.code] || "No se pudieron procesar los archivos",
    });
  }

  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ message: "El formato de los datos es inválido" });
  }

  if (err?.type === "entity.too.large") {
    return res.status(413).json({ message: "Los datos enviados son demasiado grandes" });
  }

  if (err?.name === "CastError") {
    return res.status(400).json({ message: "Identificador inválido" });
  }

  if (err?.name === "ValidationError") {
    return res.status(400).json({ message: "Los datos enviados no son válidos" });
  }

  if (err?.code === 11000) {
    return res.status(409).json({ message: "El registro ya existe" });
  }

  console.error(`[${req.method} ${req.originalUrl}]`, err);
  return res.status(500).json({ message: "Error interno del servidor" });
};

export default errorHandler;
