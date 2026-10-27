import OrderModel, { ESTADOS_VENTA } from "./models/order-model.js";

// Campos del usuario que se muestran junto a una orden (nunca la contraseña ni el DNI).
const USER_FIELDS = "nombre apellido email";

// Pagos iniciados y no concretados: no se muestran en el listado del admin salvo que se pidan.
const ESTADOS_NO_CONCRETADOS = ["pendiente_pago", "rechazado"];

// Campos que el cliente no necesita ver en sus compras
const CAMPOS_INTERNOS_ORDEN =
  "-mercadoPago -paymentId -stockDescontado -necesitaAtencion -motivoAtencion " +
  "-enviopack.necesitaAtencion -enviopack.pedidoId -envio.paquetes -cart";

// Órdenes marcadas para revisión manual: por el pago (monto distinto, sin stock, reembolso,
// envío que no se pudo crear) o por el envío (condición con alerta en Enviopack).
const FILTRO_NECESITA_ATENCION = {
  $or: [{ necesitaAtencion: true }, { "enviopack.necesitaAtencion": true }],
};

class OrderDAO {
  async createOrder(data) {
    return await OrderModel.create(data);
  }

  // "Mis compras" del cliente: solo las ventas concretadas (igual que el listado del admin,
  // sin los intentos de pago pendientes o rechazados), con nombre y fotos de cada producto
  // y sin los campos internos (datos de Mercado Pago, notas de revisión, paquetes).
  async getOrdersByUser(userId) {
    return await OrderModel.find({ user: userId, status: { $nin: ESTADOS_NO_CONCRETADOS } })
      .select(CAMPOS_INTERNOS_ORDEN)
      .populate("products.product", "item imagen")
      .sort({ date: -1 });
  }

  async getOrderById(id) {
    return await OrderModel.findById(id)
      .populate("user", USER_FIELDS)
      .populate("products.product", "item sku imagen");
  }

  async getOrderByUser(userId) {
    return await OrderModel.find({ user: userId }).sort({ date: -1 });
  }

  async updateOrder(id, data) {
    return await OrderModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

  async deleteOrder(id) {
    return await OrderModel.findByIdAndDelete(id);
  }

  async getOrderByStatus(status) {
    return await OrderModel.find({ status }).sort({ date: -1 });
  }

  async updateOrderStatus(id, status) {
    return await OrderModel.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true },
    );
  }

  // Estadísticas: solo cuentan las ventas concretadas
  async countOrders() {
    return await OrderModel.countDocuments({ status: { $in: ESTADOS_VENTA } });
  }

  async sumTotalRevenue() {
    const result = await OrderModel.aggregate([
      { $match: { status: { $in: ESTADOS_VENTA } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);
    return result[0]?.total || 0;
  }

  async sumProductsSold() {
    const result = await OrderModel.aggregate([
      { $match: { status: { $in: ESTADOS_VENTA } } },
      { $unwind: "$products" },
      { $group: { _id: null, total: { $sum: "$products.quantity" } } },
    ]);
    return result[0]?.total || 0;
  }

  // Órdenes que necesitan atención, en cualquier estado (para "Para hacer hoy" del panel)
  async countNecesitanAtencion() {
    return await OrderModel.countDocuments(FILTRO_NECESITA_ATENCION);
  }

  async getOrdersPaginated({ page = 1, limit = 10, status, atencion = false }) {
    let query;
    if (atencion) {
      query = status ? { status, ...FILTRO_NECESITA_ATENCION } : FILTRO_NECESITA_ATENCION;
    } else {
      query = status ? { status } : { status: { $nin: ESTADOS_NO_CONCRETADOS } };
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      OrderModel.find(query)
        .populate("user", USER_FIELDS)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      OrderModel.countDocuments(query),
    ]);

    return {
      orders,
      pagination: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOrdersByStatusCount() {
    const result = await OrderModel.aggregate([
      { $group: { _id: "$status", total: { $sum: 1 } } },
    ]);

    const stats = {
      pendiente: 0,
      pagado: 0,
      enviado: 0,
      entregado: 0,
      cancelado: 0,
      reembolsado: 0,
    };

    result.forEach((item) => {
      stats[item._id] = item.total;
    });

    return stats;
  }

  async getSalesByPaymentMethod() {
    const result = await OrderModel.aggregate([
      { $match: { status: { $in: ESTADOS_VENTA } } },
      { $group: { _id: "$paymentMethod", total: { $sum: "$total" } } },
    ]);

    const stats = {
      mercadopago: 0,
      efectivo: 0,
    };

    result.forEach((item) => {
      stats[item._id] = item.total;
    });

    return stats;
  }
}

export default new OrderDAO();
