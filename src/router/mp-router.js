import express from "express";
import { createOrder, mercadoPagoWebhook } from "../controllers/mp-controllers.js";
import { optionalAuth } from "../middlewares/auth-middleware.js";
import { checkoutLimiter } from "../middlewares/rate-limit.js";

const router = express.Router();

// Invitados y usuarios logueados (si hay sesión, la orden queda asociada al usuario)
router.post("/create_order", checkoutLimiter, optionalAuth, createOrder);

// Notificaciones de Mercado Pago
router.post("/webhook", mercadoPagoWebhook);

export default router;
