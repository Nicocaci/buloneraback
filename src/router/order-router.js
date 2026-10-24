import OrderController from "../controllers/order-controller.js";
import express from "express";
import authMiddleware from "../middlewares/auth-middleware.js";
import { estadoPagoLimiter } from "../middlewares/rate-limit.js";

const router = express.Router();
const adminOnly = authMiddleware(["admin"]);

// Las órdenes se crean solo desde el checkout (POST /api/mp/create_order).

// ─── Admin ───────────────────────────────
router.get("/stats", adminOnly, OrderController.getSalesStats);
router.get("/status/:status", adminOnly, OrderController.getOrderByStatus);
router.get("/user/:userId", adminOnly, OrderController.getOrderByUser);
router.get("/admin", adminOnly, OrderController.getOrdersPaginated);

// ─── Usuario logueado ────────────────────
// Mis órdenes
router.get("/", authMiddleware(), OrderController.getMyOrders);

// ─── Pública: estado del pago para la pantalla /gracias ──
router.get("/:id/estado-pago", estadoPagoLimiter, OrderController.getEstadoPago);

// Orden por ID (dueño o admin)
router.get("/:id", authMiddleware(), OrderController.getOrderById);

// ─── Admin ───────────────────────────────
router.put("/:id", adminOnly, OrderController.updateOrder);
router.put("/:id/status", adminOnly, OrderController.updateOrderStatus);
router.delete("/:id", adminOnly, OrderController.deleteOrder);

export default router;
