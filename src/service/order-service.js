import OrderRepository from "../repository/order-repository.js";
import OrderModel from "../dao/models/order-model.js";
import ProductModel from "../dao/models/product-model.js";
import mongoose from "mongoose";

class StockInsuficienteError extends Error {
  constructor(nombre) {
    super(`Stock insuficiente para "${nombre}"`);
    this.name = "StockInsuficienteError";
  }
}

const datosMercadoPago = (payment) => ({
  "mercadoPago.status": payment.status,
  "mercadoPago.statusDetail": payment.status_detail || null,
  "mercadoPago.ultimoPaymentId": String(payment.id),
  "mercadoPago.actualizado": new Date(),
});

class OrderService {
  async getOrdersByUser(userId) {
    return await OrderRepository.getOrdersByUser(userId);
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
  async getOrdersPaginated(query) {
    return await OrderRepository.getOrdersPaginated(query);
  }
  async getSalesStats() {
    const [
      totalOrders,
      totalRevenue,
      totalProductsSold,
      ordersByStatus,
      salesByPaymentMethod,
      necesitanAtencion,
    ] = await Promise.all([
      OrderRepository.getTotalOrders(),
      OrderRepository.getTotalRevenue(),
      OrderRepository.getTotalProductsSold(),
      OrderRepository.getOrdersByStatusCount(),
      OrderRepository.getSalesByPaymentMethod(),
      OrderRepository.countNecesitanAtencion(),
    ]);

    return {
      totalOrders,
      totalRevenue,
      totalProductsSold,
      ordersByStatus,
      salesByPaymentMethod,
      necesitanAtencion,
    };
  }

  // ─────────────────────────────────────────
  // Transiciones de estado por pagos de Mercado Pago.
  // Cada una es idempotente: si Mercado Pago repite la notificación, la segunda no cambia nada.
  // ─────────────────────────────────────────

  /**
   * Pago aprobado: descuenta stock y marca la orden como pagada, todo en una transacción.
   * Devuelve { resultado: "confirmada" | "sin_stock" | "sin_cambios", order }.
   */
  async confirmarPago(orderId, payment) {
    const session = await mongoose.startSession();
    let respuesta = { resultado: "sin_cambios", order: null };

    try {
      await session.withTransaction(async () => {
        respuesta = { resultado: "sin_cambios", order: null };

        const order = await OrderModel.findOne({
          _id: orderId,
          status: { $in: ["pendiente_pago", "rechazado"] },
          stockDescontado: false,
        }).session(session);

        if (!order) return;

        for (const item of order.products) {
          const result = await ProductModel.updateOne(
            { _id: item.product, stock: { $gte: item.quantity } },
            { $inc: { stock: -item.quantity } },
            { session },
          );
          if (result.modifiedCount === 0) {
            throw new StockInsuficienteError(item.nombre || String(item.product));
          }
        }

        order.status = "pagado";
        order.stockDescontado = true;
        order.paymentId = String(payment.id);
        order.mercadoPago.status = payment.status;
        order.mercadoPago.statusDetail = payment.status_detail || null;
        order.mercadoPago.ultimoPaymentId = String(payment.id);
        order.mercadoPago.actualizado = new Date();
        await order.save({ session });

        respuesta = { resultado: "confirmada", order };
      });
    } catch (error) {
      if (!(error instanceof StockInsuficienteError)) throw error;

      // El cliente ya pagó pero no alcanza el stock: se registra el pago igual
      // y se marca para revisión manual (reponer stock o devolver el dinero).
      const order = await OrderModel.findOneAndUpdate(
        { _id: orderId, status: { $in: ["pendiente_pago", "rechazado"] } },
        {
          $set: {
            status: "pagado",
            paymentId: String(payment.id),
            necesitaAtencion: true,
            motivoAtencion: `Pago aprobado sin stock suficiente. ${error.message}. No se descontó stock.`,
            ...datosMercadoPago(payment),
          },
        },
        { new: true },
      );
      respuesta = order
        ? { resultado: "sin_stock", order }
        : { resultado: "sin_cambios", order: null };
    } finally {
      await session.endSession();
    }

    return respuesta;
  }

  // Pago pendiente o en proceso (por ejemplo, revisión de Mercado Pago).
  async registrarPagoPendiente(orderId, payment) {
    return await OrderModel.findOneAndUpdate(
      { _id: orderId, status: { $in: ["pendiente_pago", "rechazado"] } },
      { $set: { status: "pendiente_pago", ...datosMercadoPago(payment) } },
      { new: true },
    );
  }

  // Pago rechazado o cancelado. La orden queda abierta por si el cliente reintenta.
  async registrarPagoRechazado(orderId, payment) {
    return await OrderModel.findOneAndUpdate(
      { _id: orderId, status: "pendiente_pago" },
      { $set: { status: "rechazado", ...datosMercadoPago(payment) } },
      { new: true },
    );
  }

  // Monto o moneda que no coinciden con la orden: no se da por pagada.
  async marcarParaRevision(orderId, payment, motivo) {
    return await OrderModel.findOneAndUpdate(
      { _id: orderId, necesitaAtencion: { $ne: true } },
      {
        $set: {
          necesitaAtencion: true,
          motivoAtencion: motivo,
          ...datosMercadoPago(payment),
        },
      },
      { new: true },
    );
  }

  /**
   * Reembolso o contracargo del pago que pagó la orden: repone el stock y marca la orden.
   * Devuelve la orden actualizada, o null si ya estaba registrado.
   */
  async registrarReembolso(orderId, payment) {
    const session = await mongoose.startSession();
    let actualizada = null;

    try {
      await session.withTransaction(async () => {
        actualizada = null;

        const order = await OrderModel.findOne({
          _id: orderId,
          paymentId: String(payment.id),
          status: { $ne: "reembolsado" },
        }).session(session);

        if (!order) return;

        if (order.stockDescontado) {
          for (const item of order.products) {
            await ProductModel.updateOne(
              { _id: item.product },
              { $inc: { stock: item.quantity } },
              { session },
            );
          }
        }

        const motivo =
          payment.status === "charged_back"
            ? "El pago tuvo un contracargo."
            : "El pago fue reembolsado.";

        order.status = "reembolsado";
        order.stockDescontado = false;
        order.necesitaAtencion = true;
        order.motivoAtencion = `${motivo} Se repuso el stock. Revisar si hay un envío para cancelar.`;
        order.mercadoPago.status = payment.status;
        order.mercadoPago.statusDetail = payment.status_detail || null;
        order.mercadoPago.actualizado = new Date();
        await order.save({ session });

        actualizada = order;
      });
    } finally {
      await session.endSession();
    }

    return actualizada;
  }
}

export default new OrderService();
