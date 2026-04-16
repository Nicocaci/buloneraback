import OrderController from "../controllers/order-controller.js";
import express from "express";
import authMiddleware from "../middlewares/auth-middleware.js";


const router = express.Router();

// Crear orden (usuario logueado)
router.post('/', authMiddleware(), OrderController.createOrder);

// Stats (solo admin)
router.get('/stats', authMiddleware(["admin"]), OrderController.getSalesStats);

// Buscar por estado (admin)
router.get('/status/:status', authMiddleware(["admin"]), OrderController.getOrderByStatus);

// Ordenes de un usuario
router.get('/user/:userId', authMiddleware(["admin"]), OrderController.getOrderByUser);

// Mis ordenes
router.get('/', authMiddleware(), OrderController.getOrders);

// Todas las ordenes paginadas (admin)
router.get('/admin', authMiddleware(["admin"]), OrderController.getOrdersPaginated);

// Orden por ID
router.get('/:id', authMiddleware(), OrderController.getOrderById);

// Actualizar orden
router.put('/:id', authMiddleware(["admin"]), OrderController.updateOrder);

// Cambiar estado
router.put('/:id/status', authMiddleware(["admin"]), OrderController.updateOrderStatus);

// Eliminar orden
router.delete('/:id', authMiddleware(["admin"]), OrderController.deleteOrder);

export default router;
