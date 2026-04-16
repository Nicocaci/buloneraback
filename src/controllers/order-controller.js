import OrderService from "../service/order-service.js";

class OrderController {
  async createOrder(req, res) {
    try {
      const orderData = {
        ...req.body,
        user: req.user.id,
      };

      const newOrder = await OrderService.createOrder(orderData);

      res.status(201).json(newOrder);
    } catch (error) {
      res.status(500).json({
        message: "Error al crear la orden",
        error: error.message,
      });
    }
  }
  async getOrders(req, res) {
    try {
      const orders = await OrderService.getOrders();
      res.status(200).json(orders);
    } catch (error) {
      res.status(500).json({
        message: "Error al obtener las ordenes",
        error: error.message,
      });
    }
  }
  async getOrderById(req, res) {
    try {
      const order = await OrderService.getOrderById(req.params.id);
      if (!order) {
        return res.status(404).json({
          message: "Orden no encontrada",
        });
      }
      res.status(200).json(order);
    } catch (error) {
      res.status(500).json({
        message: "Error al obtener la orden",
        error: error.message,
      });
    }
  }
  async getOrderByStatus(req, res) {
    try {
      const order = await OrderService.getOrderByStatus(req.params.status);
      if (!order || order.length === 0) {
        return res.status(404).json({
          message: "Orden no encontrada",
        });
      }
      res.status(200).json(order);
    } catch (error) {
      res.status(500).json({
        message: "Error al obtener la orden",
        error: error.message,
      });
    }
  }
  async getOrderByUser(req, res) {
    try {
      const order = await OrderService.getOrderByUser(req.params.userId);
      if (!order || order.length === 0) {
        return res.status(404).json({
          message: "Orden no encontrada",
        });
      }
      res.status(200).json(order);
    } catch (error) {
      res.status(500).json({
        message: "Error al obtener la orden",
        error: error.message,
      });
    }
  }
  async updateOrder(req, res) {
    try {
      const order = await OrderService.updateOrder(req.params.id, req.body);
      if (!order) {
        return res.status(404).json({
          message: "Orden no encontrada",
        });
      }
      res.status(200).json(order);
    } catch (error) {
      res.status(500).json({
        message: "Error al obtener la order",
        error: error.message,
      });
    }
  }
  async deleteOrder(req, res) {
    try {
      const order = await OrderService.deleteOrder(req.params.id);
      if (!order) {
        return res.status(404).json({
          message: "Orden no encontrado",
        });
      }
      res.status(200).json({
        message: "Orden eliminado con éxito",
      });
    } catch (error) {
      res.status(500).json({
        message: "Error al obtener la order",
        error: error.message,
      });
    }
  }

  async updateOrderStatus(req, res) {
    try {
      const order = await OrderService.updateOrderStatus(
        req.params.id,
        req.body.status,
      );
      if (!order) {
        return res.status(404).json({
          message: "Orden no encontrado",
        });
      }
      res.status(200).json({
        message: "Estado de la orden actualizado con éxito",
        order,
      });
    } catch (error) {
      res.status(500).json({
        message: "Error al obtener la order",
        error: error.message,
      });
    }
  }

  async getSalesStats(req, res) {
    try {
      const stats = await OrderService.getSalesStats();

      res.status(200).json(stats);
    } catch (error) {
      res.status(500).json({
        message: "Error al obtener estadisticas de ventas",
        error: error.message,
      });
    }
  }
  async getOrdersPaginated(req, res) {
    try {
      const { page = 1, limit = 10, status } = req.query;

      const orders = await OrderService.getOrdersPaginated({
        page: Number(page),
        limit: Number(limit),
        status,
      });

      res.status(200).json(orders);
    } catch (error) {
      res.status(500).json({
        message: "Error al obtener las órdenes",
        error: error.message,
      });
    }
  }
}
export default new OrderController();