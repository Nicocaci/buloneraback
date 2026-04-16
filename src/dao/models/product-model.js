import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    sku: { type: String, required: true, unique: true },
    item: { type: String, required: true },
    imagen: { type: [String], required: true },
    descripcion: { type: String, required: true },
    marca: { type: String, required: true },
    categoria: { type: String, required: true },
    subcategoria: { type: String, required: true },
    precio: { type: Number, required: true },
    iva: { type: Number, default: 0 },
    stock: { type: Number, required: true },
    estado: { type: String, enum: ["activo", "inactivo"], default: "activo" },
    oferta: { type: Boolean, default: false }
});

const ProductModel = mongoose.model('products', productSchema);

export default ProductModel;