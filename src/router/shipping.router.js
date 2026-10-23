import { Router } from "express";
import {
  getShippingOptions,
  getShippingCost,
  shipOrder,
  getShipmentTracking,
  getShippingCondiciones,
  getShippingLabel,
} from "../controllers/shipping.controller.js";
import authMiddleware from "../middlewares/auth-middleware.js";
import { shippingQuoteLimiter } from "../middlewares/rate-limit.js";

const router = Router();
const adminOnly = authMiddleware(["admin"]);

// Pública: la usa el checkout para cotizar
router.get("/options", shippingQuoteLimiter, getShippingOptions);

// Solo admin
router.get("/costo", adminOnly, getShippingCost);
router.post("/orders/:orderId/ship", adminOnly, shipOrder);
router.get("/shipments/:envioId/tracking", adminOnly, getShipmentTracking);
router.get("/condiciones", adminOnly, getShippingCondiciones);
router.get("/:envioId/etiqueta", adminOnly, getShippingLabel);

export default router;
