
import OrderRepository from "../repository/order-repository.js";
import ProductModel from "../dao/models/product-model.js";
import mongoose from "mongoose";

class OrderService {
  async createOrder(data) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      // 1. Validar y descontar stock de cada producto, de forma atómica
      for (const item of data.products) {
        const result = await ProductModel.updateOne(
          { _id: item.product, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { session },
        );

        if (result.modifiedCount === 0) {
          const product = await ProductModel.findById(item.product);
          const disponible = product ? product.stock : 0;
          throw new Error(
            `Stock insuficiente para "${product?.item || item.product}". Disponible: ${disponible}`,
          );
        }
      }

      // 2. Recién ahora crear la orden
      const newOrder = await OrderRepository.createOrder(data, { session });

      await session.commitTransaction();
      return newOrder;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
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
