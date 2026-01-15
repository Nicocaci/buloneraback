import OrderService from "../service/order-service.js";

class OrderController{
    async createOrder(req, res){
        try {
            const newOrder = await OrderService.createOrder(req.body);
            res.status(201).json(newOrder);
        } catch (error) {
            res.status(500).json({ message: "Error al crear la orden", error: error.message });
        }
    }
    async getOrderById(req, res){
        try {
            const order = await OrderService.getOrderById(req.params.id);
            res.status(200).json(order);
        } catch (error) {
            res.status(500).json({ message: "Error al obtener la orden", error: error.message });
        }
    }
    async updateOrder(req, res){
        try {
            const updatedOrder = await OrderService.updateOrder(req.params.id, req.body);
            res.status(200).json(updatedOrder);
        } catch (error) {
            res.status(500).json({ message: "Error al actualizar la orden", error: error.message });
        }
    }
    async deleteOrder(req, res){
        try {
            const deletedOrder = await OrderService.deleteOrder(req.params.id);
            res.status(200).json({
                message: "Orden eliminado con exito"
            });
        } catch (error) {
            res.status(500).json({ message: "Error al eliminar la orden", error: error.message });
        }
    }
    async getOrdersByUser(req, res){
        try {
            const orders = await OrderService.getOrdersByUser(req.params.userId);
            res.status(200).json(orders);
        } catch (error) {
            res.status(500).json({ message: "Error al obtener las ordenes", error: error.message });
        }
    }
    async getOrdersByStatus(req, res){
        try {
            const orders = await OrderService.getOrdersByStatus(req.params.status);
            res.status(200).json(orders);
        } catch (error) {
            res.status(500).json({ message: "Error al obtener las ordenes", error: error.message });
        }
    }
    async getOrders(req, res){
        try {
            const orders = await OrderService.getOrders();
            res.status(200).json(orders);
        } catch (error) {
            res.status(500).json({ message: "Error al obtener las ordenes", error: error.message });
        }
    }
}
export default new OrderController();