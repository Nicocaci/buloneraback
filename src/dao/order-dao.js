import OrderModel from './models/order-model.js'

class OrderDAO {
  async createOrder(data) {
    try {
      const newOrder = await OrderModel.create(data);
      return newOrder;
    } catch (error) {
      throw error;
    }
  }
  async getOrders() {
    try {
      const orders = await OrderModel.find();
      return orders;
    } catch (error) {
      throw error;
    }
  }
  async getOrderById(id) {
    try {
      const order = await OrderModel.findById(id).populate(
        "user products.product",
      );
      return order;
    } catch (error) {
      throw error;
    }
  }
  async getOrderByUser(userId) {
    try {
      const orders = await OrderModel.find({ user: userId });
      return orders;
    } catch (error) {
      throw error;
    }
  }
  async updateOrder(id, data) {
    try {
      const order = await OrderModel.findByIdAndUpdate(id, data, { new: true });
      return order;
    } catch (error) {
      throw error;
    }
  }
  async deleteOrder(id) {
    try {
      const order = await OrderModel.findByIdAndDelete(id);
      return order;
    } catch (error) {
      throw error;
    }
  }
  async getOrderByStatus(status) {
    try {
      const orders = await OrderModel.find({ status });
      return orders;
    } catch (error) {
      throw error;
    }
  }
  async updateOrderStatus(id, status) {
    try {
      const order = await OrderModel.findByIdAndUpdate(
        id,
        { status },
        { new: true },
      );
      return order;
    } catch (error) {
      throw error;
    }
  }
  async countOrders() {
    return await OrderModel.countDocuments();
  }

  async sumTotalRevenue() {
    const result = await OrderModel.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$total" },
        },
      },
    ]);

    return result[0]?.total || 0;
  }

  async sumProductsSold() {
    const result = await OrderModel.aggregate([
      { $unwind: "$products" },
      {
        $group: {
          _id: null,
          total: { $sum: "$products.quantity" },
        },
      },
    ]);

    return result[0]?.total || 0;
  }
  async getOrdersPaginated({ page = 1, limit = 10, status}) {
    const query = {};

    if(status) {
        query.status = status;
    }

    const skip = (page - 1) * limit;

    const orders = await OrderModel
    .find(query)
    .populate("user")
    .sort({ date: -1 })
    .skip(skip)
    .limit(limit);

    const total = await OrderModel.countDocuments(query);

    return {
        orders,
        pagination: {
            total,
            page,
            totalPages: Math.ceil(total / limit),
        }
    };
    
  }

  async getOrdersByStatusCount() {
  const result = await OrderModel.aggregate([
    {
      $group: {
        _id: "$status",
        total: { $sum: 1 }
      }
    }
  ]);

  const stats = {
    pendiente: 0,
    enviado: 0,
    entregado: 0,
    cancelado: 0
  };

  result.forEach(item => {
    stats[item._id] = item.total;
  });

  return stats;
}
async getSalesByPaymentMethod() {

const result = await OrderModel.aggregate([
{
    $group: {
        _id: "$paymentMethod",
        total: { $sum: "$total" }
    }
}
]);

const stats = {
    mercadopago: 0,
    efectivo: 0
};

result.forEach(item => {
    stats[item._id] = item.total;
});

return stats;
}
}

export default new OrderDAO();
