import OrderModel from "./models/order-model.js";

class OrderDAO{
    async createOrder(order){
        try {
            const newOrder = await OrderModel.create(order);
            return newOrder;
        } catch (error) {
            throw error;
        }
    }
    async getOrderById(id){
        try {
            const order = await OrderModel.findById(id);
            return order;
        } catch (error) {
            throw error;
        }
    }
    async updateOrder(id, order){
        try {
            const updatedOrder = await OrderModel.findByIdAndUpdate(id, order, { new: true });
            return updatedOrder;
        } catch (error) {
            throw error;
        }
    }
    async deleteOrder(id){
        try {
            const deletedOrder = await OrderModel.findByIdAndDelete(id);    
            return deletedOrder;
        } catch (error) {
            throw error;
        }
    }
    async getOrders(){
        try {
            const orders = await OrderModel.find();
            return orders;
        } catch (error) {
            throw error;
        }
    }
    async getOrdersByUser(userId){
        try {
            const orders = await OrderModel.find({ user: userId });
            return orders;
        } catch (error) {
            throw error;
        }
    }
    async getOrdersByStatus(status){
        try {
            const orders = await OrderModel.find({ status });   
            return orders;
        } catch (error) {
            throw error;
        }
    }
}

export default new OrderDAO();