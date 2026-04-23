import CartDAO from "../dao/cart-dao.js";

class CartRepository {
  async createCart(cart) {
    return await CartDAO.createCart(cart);
  }
  async getCartById(id) {
    return await CartDAO.getCartById(id);
  }
  async updateCart(id, cart) {
    return await CartDAO.updateCart(id, cart);
  }
  async deleteCart(id) {
    return await CartDAO.deleteCart(id);
  }
  async getCarts() {
    return await CartDAO.getCarts();
  }
  async addProductToCart(id, product, quantity) {
    return await CartDAO.addProductToCart(id, product, quantity);
  }
  async removeProductFromCart(id, product) {
    return await CartDAO.removeProductFromCart(id, product);
  }
  async updateProductQuantity(id, product, quantity) {
    return await CartDAO.updateProductQuantity(id, product, quantity);
  }
  async clearCart(id) {
    return await CartDAO.clearCart(id);
  }
  async getCartByUserId(userId) {
    return await CartDAO.getCartByUserId(userId);
  }
  async createCartForUser(userId) {
    return await CartDAO.createCartForUser(userId);
  }
  async saveCart(cart) {
    return await CartDAO.saveCart(cart);
  }
}
export default new CartRepository();
