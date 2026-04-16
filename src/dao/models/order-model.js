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
    enum: ["pendiente", "enviado", "entregado", "cancelado"],
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
