import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    apellido: { type: String, required: true },
    dni: { type: String, required: true, unique: true },
    direccion: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    // select: false → el hash nunca sale en las consultas salvo que se pida con .select("+password")
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["admin", "user"], default: "user" },
    cart: {type: mongoose.Schema.Types.ObjectId, ref: 'carts'},
    orders: {type: mongoose.Schema.Types.ObjectId, ref: 'orders'},
});

// El login busca el email sin distinguir mayúsculas (collation es, fuerza 2): el índice
// único de `email` usa la collation por defecto y no sirve para esa búsqueda.
// Mismo campo con otra collation: MongoDB lo permite si el índice tiene otro nombre.
userSchema.index(
    { email: 1 },
    { name: "email_sin_mayusculas", collation: { locale: "es", strength: 2 } },
);

const UserModel = mongoose.model('users', userSchema);
export default UserModel;
