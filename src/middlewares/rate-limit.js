import { rateLimit } from "express-rate-limit";

const MINUTO = 60 * 1000;

const crearLimite = ({ windowMs, limit, message, ...rest }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message },
    ...rest,
  });

// Los intentos exitosos no cuentan: solo frena a quien prueba contraseñas.
export const loginLimiter = crearLimite({
  windowMs: 15 * MINUTO,
  limit: 10,
  skipSuccessfulRequests: true,
  message:
    "Demasiados intentos de inicio de sesión. Probá de nuevo en unos minutos.",
});

export const registerLimiter = crearLimite({
  windowMs: 60 * MINUTO,
  limit: 10,
  message: "Demasiados registros desde esta conexión. Probá más tarde.",
});

export const contactLimiter = crearLimite({
  windowMs: 60 * MINUTO,
  limit: 5,
  message:
    "Enviaste varias consultas seguidas. Probá de nuevo más tarde o escribinos por WhatsApp.",
});

export const checkoutLimiter = crearLimite({
  windowMs: 15 * MINUTO,
  limit: 20,
  message: "Demasiados intentos de pago seguidos. Probá de nuevo en unos minutos.",
});

export const shippingQuoteLimiter = crearLimite({
  windowMs: 5 * MINUTO,
  limit: 60,
  message: "Demasiadas cotizaciones de envío seguidas. Probá en unos minutos.",
});
