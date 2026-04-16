
import OrderRepository from "../repository/order-repository.js";

class OrderService {
  async createOrder(data) {
    return await OrderRepository.createOrder(data);
  }
  async getOrders() {
    return await OrderRepository.getOrders();
  }
  async getOrderById(id) {
    return await OrderRepository.getOrderById(id);
  }
  async getOrderByStatus(status) {
    return await OrderRepository.getOrderByStatus(status);
  }
  async getOrderByUser(userId) {
    return await OrderRepository.getOrderByUser(userId);
  }
  async updateOrder(id, data) {
    return await OrderRepository.updateOrder(id, data);
  }
  async deleteOrder(id) {
    return await OrderRepository.deleteOrder(id);
  }
  async updateOrderStatus(id, status) {
    return await OrderRepository.updateOrderStatus(id, status);
  }
  async getSalesStats() {
    const totalOrders = await OrderRepository.getTotalOrders();
    const totalRevenue = await OrderRepository.getTotalRevenue();
    const totalProductsSold = await OrderRepository.getTotalProductsSold();

    return {
      totalOrders,
      totalRevenue,
      totalProductsSold,
    };
  }
  async getOrdersPaginated(query) {
    return await OrderRepository.getOrdersPaginated(query);
  }
  async getSalesStats() {
    const totalOrders = await OrderRepository.getTotalOrders();
    const totalRevenue = await OrderRepository.getTotalRevenue();
    const totalProductsSold = await OrderRepository.getTotalProductsSold();
    const ordersByStatus = await OrderRepository.getOrdersByStatusCount();
    const salesByPaymentMethod = await OrderRepository.getSalesByPaymentMethod();

    return {
      totalOrders,
      totalRevenue,
      totalProductsSold,
      ordersByStatus,
      salesByPaymentMethod
    };
  }
  
}

export default new OrderService();
