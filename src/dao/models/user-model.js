import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    apellido: { type: String, required: true },
    dni: { type: String, required: true, unique: true },
    direccion: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "user"], default: "user" },
    cart: {type: mongoose.Schema.Types.ObjectId, ref: 'carts'},
    orders: {type: mongoose.Schema.Types.ObjectId, ref: 'orders'},
});

const UserModel = mongoose.model('users', userSchema);
export default UserModel;
