import CartModel from "./models/cart-model.js";

class CartDAO {
    async createCart(cart) {
        try {
            const newCart = await CartModel.create(cart);
            return newCart;
        } catch (error) {
            throw error;
        }
    }
    async getCartById(id) {
        try {
            const cart = await CartModel.findById(id).populate('products.product');
            if (!cart) {
                throw new Error('Carrito no encontrado');
            }
            return cart;
        } catch (error) {
            throw error;
        }
    }
    async updateCart(id, cart) {
        try {
            const updatedCart = await CartModel.findByIdAndUpdate(id, cart, { new: true }).populate('products.product');
            if (!updatedCart) {
                throw new Error('Carrito no encontrado');
            }
            return updatedCart;
        } catch (error) {
            throw error;
        }
    }
    async deleteCart(id) {
        try {
            const deletedCart = await CartModel.findByIdAndDelete(id).populate('products.product');
            if (!deletedCart) {
                throw new Error('Carrito no encontrado');
            }
            return deletedCart;
        } catch (error) {
            throw error;
        }
    }
    async getCarts() {
        try {
            const carts = await CartModel.find().populate('products.product');
            return carts;
        } catch (error) {
            throw error;
        }
    }
    async addProductToCart(id, product, quantity) {
        try {
            const cart = await CartModel.findById(id).populate('products.product');
            if (!cart) {
                throw new Error('Carrito no encontrado');
            }
            const existingProduct = cart.products.find(
                p => p.product?._id?.toString() === product.toString()
            );

            if (existingProduct) {
                existingProduct.quantity += quantity;
            } else {
                cart.products.push({ product, quantity });
            }
            await cart.save();
            return cart;
        } catch (error) {
            throw error;
        }
    }
    async removeProductFromCart(id, product) {
        try {
            const cart = await CartModel.findById(id).populate('products.product');
            if (!cart) {
                throw new Error('Carrito no encontrado');
            }
            cart.products = cart.products = cart.products.filter(
                p => p.product._id.toString() !== product.toString()
            );
            await cart.save();
            return cart;
        } catch (error) {
            throw error;
        }
    }
    async updateProductQuantity(id, product, quantity) {
        try {
            const cart = await CartModel.findById(id).populate('products.product');
            if (!cart) {
                throw new Error('Carrito no encontrado');
            }

            const existingProduct = cart.products.find(
                p => p.product._id.toString() === product.toString()
            );

            if (!existingProduct) {
                throw new Error('Producto no encontrado en el carrito');
            }

            existingProduct.quantity = quantity;

            await cart.save();
            return cart;
        } catch (error) {
            throw error;
        }
    }

    async clearCart(id) {
        try {
            const cart = await CartModel.findById(id).populate('products.product');
            if (!cart) {
                throw new Error('Carrito no encontrado');
            }
            cart.products = [];
            await cart.save();
            return cart;
        } catch (error) {
            throw error;
        }
    }
}
export default new CartDAO();