import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true },
  item: { type: String, required: true },
  imagen: { type: [String], required: true },
  descripcion: { type: String, required: true },
  marca: { type: String, required: true },
  categoria: { type: String },
  subcategoria: { type: String },
  precio: { type: Number, required: true },
  iva: { type: Number, default: 21 },
  stock: { type: Number, required: true },
  estado: { type: String, enum: ["activo", "inactivo"], default: "activo" },
  peso: { type: Number, min: 0 }, // kg
  alto: { type: Number, min: 0 }, // cm
  ancho: { type: Number, min: 0 }, // cm
  largo: { type: Number, min: 0 }, // cm
  oferta: {
    activa: { type: Boolean, default: false },
    descuento: { type: Number, default: 0, min: 0, max: 100 },
    vence: { type: Date, default: null },
  },
});

// ─── Índices ───────────────────────────────────────────────
// Listado y filtros del catálogo (siempre se filtra por estado: "activo")
productSchema.index({ estado: 1, categoria: 1, subcategoria: 1 });
// Productos en oferta, ordenados por descuento
productSchema.index({ "oferta.activa": 1, "oferta.descuento": -1 });

// Una oferta solo aplica si está activa, tiene descuento y no venció.
// Misma regla que ProductDao._isOfertaVigente y el cálculo del checkout.
export const isOfertaVigente = (oferta, ahora = new Date()) => {
  if (!oferta?.activa || !oferta?.descuento) return false;
  if (!oferta.vence) return true;
  return new Date(oferta.vence) > ahora;
};

export const calcularPrecioConIva = (precio, iva) =>
  Math.round(precio * (1 + (iva ?? 0) / 100));

export const calcularPrecioFinal = (precio, iva, oferta) => {
  const conIva = calcularPrecioConIva(precio, iva);
  if (!isOfertaVigente(oferta)) return conIva;
  return Math.round(conIva * (1 - oferta.descuento / 100));
};

//Precio con IVA incluido
productSchema.virtual("precioConIva").get(function () {
  return calcularPrecioConIva(this.precio, this.iva);
});

// Precio que se cobra: con IVA y con la oferta aplicada si está vigente
productSchema.virtual("precioFinal").get(function () {
  return calcularPrecioFinal(this.precio, this.iva, this.oferta);
});

productSchema.virtual("ofertaVigente").get(function () {
  return isOfertaVigente(this.oferta);
});

productSchema.set("toJSON", { virtuals: true });

const ProductModel = mongoose.model("products", productSchema);

export default ProductModel;
