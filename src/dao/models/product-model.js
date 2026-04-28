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
    oferta: { 
        activa: { type:Boolean, default: false},
        descuento: { type:Number, default:0, min:0, max:100},
        vence: { type: Date, default: null},
    },
    }
);
//Precio con IVA incluido
// 
productSchema.virtual('precioConIva').get(function () {
    return Math.round(this.precio * (1 + this.iva / 100));
});

productSchema.virtual("precioFinal").get(function () {
    const base = thisprecioConIva;
    if( !this.oferta.activa || this.oferta.descuento === 0) return base;
    return Math.round(base * (1 - this.oferta.descuento / 100));
});

productSchema.set('toJSON', { virtuals: true});

const ProductModel = mongoose.model('products', productSchema);

export default ProductModel;