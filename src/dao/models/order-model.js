import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  },

  cart: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "carts",
  },

  // 👇 agregar esto
  paymentId: {
    type: String,
    unique: true,
    sparse: true,
  },
  enviopack: {
    pedidoId: { type: Number },
    envioId: { type: Number },
    trackingNumber: { type: String, default: null },
    condicion: { type: String, default: null }, // código crudo, útil para debug
    necesitaAtencion: { type: Boolean, default: false },
  },
  products: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "products",
      },
      quantity: { type: Number, required: true },
    },
  ],

  total: { type: Number, required: true },

  date: { type: Date, default: Date.now },

  status: {
    type: String,
    enum: ["pendiente", "enviado", "entregado", "cancelado", "pagado"],
    default: "pendiente",
  },

  paymentMethod: {
    type: String,
    enum: ["mercadopago", "efectivo"],
    required: true,
  },
});

const OrderModel = mongoose.model("orders", orderSchema);

export default OrderModel;
