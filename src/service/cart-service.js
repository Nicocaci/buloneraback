import CartRepository from "../repository/cart-repository.js";
import CartModel from "../dao/models/cart-model.js";
import mongoose from "mongoose";

class CartService {
  async createCart(cart) {
    return await CartRepository.createCart(cart);
  }
  async getCartByUserId(userId) {
    return await CartRepository.getCartByUserId(userId);
  }

  async createCartForUser(userId) {
    return await CartRepository.createCartForUser(userId);
  }

  async saveCart(cart) {
    return await CartRepository.saveCart(cart);
  }
  async deleteCartByUserId(userId) {
  return await CartModel.deleteMany({
    user: new mongoose.Types.ObjectId(userId),
  });
}
}
export default new CartService();
