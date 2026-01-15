import express from "express";
import { createOrder } from "../controllers/mp-controllers.js";

const router = express.Router();
router.post('/create_order', createOrder);
export default router;