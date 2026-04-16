import OrderDAO from "../dao/order-dao.js";

class OrderRepository {
  async createOrder(data) {
    return await OrderDAO.createOrder(data);
  }
  async getOrders() {
    return await OrderDAO.getOrders();
  }
  async getOrderById(id) {
    return await OrderDAO.getOrderById(id);
  }
  async getOrderByStatus(status) {
    return await OrderDAO.getOrderByStatus(status);
  }
  async getOrderByUser(userId) {
    return await OrderDAO.getOrderByUser(userId);
  }
  async updateOrder(id, data) {
    return await OrderDAO.updateOrder(id, data);
  }
  async deleteOrder(id) {
    return await OrderDAO.deleteOrder(id);
  }
  async updateOrderStatus(id, status) {
    return await OrderDAO.updateOrderStatus(id, status);
  }
  async getTotalOrders() {
    return await OrderDAO.countOrders();
  }
  async getTotalRevenue() {
    return await OrderDAO.sumTotalRevenue();
  }
  async getTotalProductsSold() {
    return await OrderDAO.sumProductsSold();
  }
  async getOrdersPaginated(params) {
  return await OrderDAO.getOrdersPaginated(params);
}
async getOrdersByStatusCount() {
  return await OrderDAO.getOrdersByStatusCount();
}
async getSalesByPaymentMethod() {
    return await OrderDAO.getSalesByPaymentMethod();
}

}

export default new OrderRepository();
