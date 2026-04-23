import CartRepository from "../repository/cart-repository.js";
import CartModel from "../dao/models/cart-model.js";
import mongoose from "mongoose";

class CartService {
  async createCart(cart) {
    return await CartRepository.createCart(cart);
  }
  async getCartById(id) {
    return await CartRepository.getCartById(id);
  }
  async updateCart(id, cart) {
    return await CartRepository.updateCart(id, cart);
  }
  async deleteCart(id) {
    return await CartRepository.deleteCart(id);
  }
  async getCarts() {
    return await CartRepository.getCarts();
  }
  async addProductToCart(id, product, quantity) {
    return await CartRepository.addProductToCart(id, product, quantity);
  }
  async removeProductFromCart(id, product) {
    return await CartRepository.removeProductFromCart(id, product);
  }
  async updateProductQuantity(id, product, quantity) {
    return await CartRepository.updateProductQuantity(id, product, quantity);
  }
  async clearCart(id) {
    return await CartRepository.clearCart(id);
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
