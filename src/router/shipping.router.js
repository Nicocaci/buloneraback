import { Router } from "express";
import {
  getShippingOptions,
  getShippingCost,
  shipOrder,
  getShipmentTracking,
} from "../controllers/shipping.controller.js";

const router = Router();

router.get("/options", getShippingOptions);
router.get("/costo", getShippingCost);
router.post("/orders/:orderId/ship", shipOrder);
router.get("/shipments/:envioId/tracking", getShipmentTracking);

export default router;