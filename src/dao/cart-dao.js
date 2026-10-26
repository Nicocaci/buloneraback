import CartModel from "./models/cart-model.js";

class CartDAO {
  async createCart(cart) {
    return await CartModel.create(cart);
  }

  async getCartByUserId(userId) {
    return await CartModel.findOne({ user: userId }).populate("products.product");
  }

  async createCartForUser(userId) {
    return await CartModel.create({ user: userId, products: [] });
  }

  async saveCart(cart) {
    await cart.save();
    await cart.populate("products.product");
    return cart;
  }
}

export default new CartDAO();
