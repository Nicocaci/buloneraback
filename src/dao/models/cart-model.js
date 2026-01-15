import mongoose from "mongoose";

const cartSchema = new mongoose.Schema({
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'users'},
    products: [
        {
            product: {type: mongoose.Schema.Types.ObjectId, ref: 'products'},
            quantity: {type: Number, required: true},
        }
    ],
});

const CartModel = mongoose.model('carts', cartSchema);
export default CartModel;