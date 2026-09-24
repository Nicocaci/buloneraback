import mongoose from "mongoose";
import CounterModel from "./Counter.js";

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
  },
  guestEmail: {
    type: String,
    default: null,
  },
  cart: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "carts",
  },

  paymentId: {
    type: String,
    unique: true,
    sparse: true,
  },
  enviopack: {
    pedidoId: { type: Number },
    envioId: { type: Number },
    trackingNumber: { type: String, default: null },
    condicion: { type: String, default: null },
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

  subtotal: { type: Number, default: 0 },
  shippingCost: { type: Number, default: 0 },
  shippingMethod: {
    tipo: { type: String, default: null },
    correo: { type: String, default: null },
    servicio: { type: String, default: null },
  },

  total: { type: Number, required: true },

  date: { type: Date, default: Date.now },

  status: {
    type: String,
    enum: ["pendiente", "enviado", "entregado", "cancelado", "pagado"],
    default: "pendiente",
  },

  paymentMethod: {
    type: String,
    enum: ["mercadopago"],
    required: true,
  },

  shippingAddress: {
    calle: { type: String },
    numero: { type: String },
    ciudad: { type: String },
    provincia: { type: String },
    codigoPostal: { type: String },
    notas: { type: String, default: "" },
  },
  orderNumber: { type: Number, unique: true },
});
orderSchema.pre("save", async function (next) {
  if (this.isNew && this.orderNumber == null) {
    const counter = await CounterModel.findOneAndUpdate(
      { _id: "orderNumber" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    this.orderNumber = counter.seq;
  }
  next();
});
const OrderModel = mongoose.model("orders", orderSchema);

export default OrderModel;
