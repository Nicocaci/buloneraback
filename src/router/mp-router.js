import express from "express";
import { createOrder, mercadoPagoWebhook } from "../controllers/mp-controllers.js";

const router = express.Router();
router.post('/create_order', createOrder);
router.post('/webhook', mercadoPagoWebhook);
export default router;