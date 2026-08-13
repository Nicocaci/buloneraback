// src/router/shipping-webhook-router.js
import { Router } from "express";
import { handleEnviopackWebhook } from "../controllers/shipping.controller.js";

const router = Router();

router.post("/enviopack", handleEnviopackWebhook);

export default router;