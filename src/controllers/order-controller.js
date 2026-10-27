import OrderService from "../service/order-service.js";
import OrderModel, { ORDER_STATUSES } from "../dao/models/order-model.js";
import { procesarPago } from "../service/payment/mp-payment-service.js";
import { isValidObjectId } from "../utils/validators.js";

const ESTADOS_DE_PAGO_ABIERTO = ["pendiente_pago", "rechazado"];

class OrderController {
  // Órdenes del usuario logueado
  async getMyOrders(req, res, next) {
    try {
      const orders = await OrderService.getOrdersByUser(req.user.id);
      res.status(200).json(orders);
    } catch (error) {
      next(error);
    }
  }

  // Detalle de una orden: solo el dueño o un admin
  async getOrderById(req, res, next) {
    try {
      if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      const order = await OrderService.getOrderById(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Orden no encontrada" });
      }

      const ownerId = order.user?._id ?? order.user;
      if (req.user.role !== "admin" && String(ownerId) !== String(req.user.id)) {
        return res.status(404).json({ message: "Orden no encontrada" });
      }

      res.status(200).json(order);
    } catch (error) {
      next(error);
    }
  }

  // Estado del pago para la pantalla /gracias (pública, sin datos personales).
  // Si viene ?payment_id=..., se consulta ese pago a Mercado Pago para no depender
  // de que el webhook haya llegado antes que el cliente.
  async getEstadoPago(req, res, next) {
    try {
      const { id } = req.params;
      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      let order = await OrderModel.findById(id).select("status orderNumber").lean();
      if (!order) {
        return res.status(404).json({ message: "Orden no encontrada" });
      }

      const paymentId = req.query.payment_id;
      if (paymentId && ESTADOS_DE_PAGO_ABIERTO.includes(order.status)) {
        try {
          await procesarPago(paymentId, { orderIdEsperado: id });
          order = await OrderModel.findById(id).select("status orderNumber").lean();
        } catch (error) {
          // Si Mercado Pago no responde, se devuelve el estado actual; el webhook lo va a actualizar.
          console.error(`No se pudo consultar el pago ${paymentId}:`, error?.message);
        }
      }

      res.status(200).json({ orderNumber: order.orderNumber, status: order.status });
    } catch (error) {
      next(error);
    }
  }

  async getOrderByStatus(req, res, next) {
    try {
      const order = await OrderService.getOrderByStatus(req.params.status);
      res.status(200).json(order);
    } catch (error) {
      next(error);
    }
  }

  async getOrderByUser(req, res, next) {
    try {
      if (!isValidObjectId(req.params.userId)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      const order = await OrderService.getOrderByUser(req.params.userId);
      res.status(200).json(order);
    } catch (error) {
      next(error);
    }
  }

  async updateOrder(req, res, next) {
    try {
      if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      const data = { ...req.body };
      delete data._id;
      delete data.orderNumber;

      const order = await OrderService.updateOrder(req.params.id, data);
      if (!order) {
        return res.status(404).json({ message: "Orden no encontrada" });
      }
      res.status(200).json(order);
    } catch (error) {
      next(error);
    }
  }

  async deleteOrder(req, res, next) {
    try {
      if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      const order = await OrderService.deleteOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Orden no encontrada" });
      }
      res.status(200).json({ message: "Orden eliminada con éxito" });
    } catch (error) {
      next(error);
    }
  }

  async updateOrderStatus(req, res, next) {
    try {
      const { status } = req.body;
      if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      if (!ORDER_STATUSES.includes(status)) {
        return res.status(400).json({ message: "Estado inválido" });
      }

      const order = await OrderService.updateOrderStatus(req.params.id, status);
      if (!order) {
        return res.status(404).json({ message: "Orden no encontrada" });
      }
      res.status(200).json({
        message: "Estado de la orden actualizado con éxito",
        order,
      });
    } catch (error) {
      next(error);
    }
  }

  async getSalesStats(req, res, next) {
    try {
      const stats = await OrderService.getSalesStats();
      res.status(200).json(stats);
    } catch (error) {
      next(error);
    }
  }

  async getOrdersPaginated(req, res, next) {
    try {
      const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
      const status = ORDER_STATUSES.includes(req.query.status) ? req.query.status : undefined;
      // ?atencion=1: solo las órdenes marcadas para revisión
      const atencion = req.query.atencion === "1" || req.query.atencion === "true";

      const orders = await OrderService.getOrdersPaginated({ page, limit, status, atencion });
      res.status(200).json(orders);
    } catch (error) {
      next(error);
    }
  }
}

export default new OrderController();
