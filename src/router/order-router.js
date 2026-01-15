import OrderController from "../controllers/order-controller.js";
import express from "express";
const router = express.Router();

router.post('/', OrderController.createOrder);
router.get('/:id', OrderController.getOrderById);
router.put('/:id', OrderController.updateOrder);
router.delete('/:id', OrderController.deleteOrder);
router.get('/user/:userId', OrderController.getOrdersByUser);
router.get('/status/:status', OrderController.getOrdersByStatus);
router.get('/', OrderController.getOrders);
export default router;