import mongoose from "mongoose";
import CounterModel from "./Counter.js";

// Estados de una orden:
// - pendiente_pago: se generó el pago en Mercado Pago y todavía no se aprobó
// - rechazado:      Mercado Pago rechazó el pago (el cliente puede reintentar con la misma orden)
// - pagado:         pago aprobado y stock descontado
// - enviado / entregado / cancelado: los maneja el admin o el webhook de Enviopack
// - reembolsado:    el pago se devolvió o tuvo contracargo (se repone el stock)
// - pendiente:      estado de órdenes viejas, se mantiene por compatibilidad
export const ORDER_STATUSES = [
  "pendiente_pago",
  "rechazado",
  "pagado",
  "pendiente",
  "enviado",
  "entregado",
  "cancelado",
  "reembolsado",
];

// Estados que cuentan como venta concretada (estadísticas del admin).
export const ESTADOS_VENTA = ["pendiente", "pagado", "enviado", "entregado"];

const orderSchema = new mongoose.Schema(
  {
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

    // Datos del comprador tal como los cargó en el checkout
    comprador: {
      nombre: { type: String },
      apellido: { type: String },
      email: { type: String },
      telefono: { type: String },
    },

    // ID del pago aprobado en Mercado Pago
    paymentId: {
      type: String,
      unique: true,
      sparse: true,
    },
    mercadoPago: {
      preferenceId: { type: String, default: null },
      status: { type: String, default: null },
      statusDetail: { type: String, default: null },
      ultimoPaymentId: { type: String, default: null },
      actualizado: { type: Date, default: null },
    },
    // true cuando el stock de esta orden ya se descontó (evita descontarlo dos veces)
    stockDescontado: { type: Boolean, default: false },

    // Algo requiere revisión manual (monto distinto, sin stock al aprobarse, reembolso, etc.)
    necesitaAtencion: { type: Boolean, default: false },
    motivoAtencion: { type: String, default: null },

    enviopack: {
      pedidoId: { type: Number },
      envioId: { type: Number },
      trackingNumber: { type: String, default: null },
      condicion: { type: String, default: null },
      necesitaAtencion: { type: Boolean, default: false },
    },

    // Cada ítem guarda una foto del producto al momento de la compra:
    // si después cambia el precio o se borra el producto, la orden no pierde información.
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "products",
        },
        quantity: { type: Number, required: true },
        nombre: { type: String },
        sku: { type: String },
        precioUnitario: { type: Number },
      },
    ],

    subtotal: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },
    shippingMethod: {
      tipo: { type: String, default: null },
      correo: { type: String, default: null },
      servicio: { type: String, default: null },
    },

    // Datos que necesita Enviopack para generar el envío al aprobarse el pago
    envio: {
      metodo: { type: String, enum: ["retiro_local", "envio", null], default: null },
      opcion: {
        tipo: { type: String },
        correo: { type: String },
        servicio: { type: String },
        despacho: { type: String },
        modalidad: { type: String },
        horasEntrega: { type: Number },
      },
      paquetes: [
        {
          _id: false,
          alto: Number,
          ancho: Number,
          largo: Number,
          peso: Number,
        },
      ],
    },

    total: { type: Number, required: true },

    date: { type: Date, default: Date.now },

    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: "pendiente_pago",
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
  },
  { timestamps: true },
);

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
