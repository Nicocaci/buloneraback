import OrderDAO from "../dao/order-dao.js";
class OrderService{
    async createOrder(order){
        return await OrderDAO.createOrder(order);
    }
    async getOrderById(id){
        return await OrderDAO.getOrderById(id);
    }
    async updateOrder(id, order){
        return await OrderDAO.updateOrder(id, order);
    }
    async deleteOrder(id){
        return await OrderDAO.deleteOrder(id);
    }
    async getOrders(){
        return await OrderDAO.getOrders();
    }
    async getOrdersByUser(userId){
        return await OrderDAO.getOrdersByUser(userId);
    }
    async getOrdersByStatus(status){
        return await OrderDAO.getOrdersByStatus(status);
    }
}
export default new OrderService();