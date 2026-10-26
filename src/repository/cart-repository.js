import CartDAO from "../dao/cart-dao.js";

class CartRepository {
  async createCart(cart) {
    return await CartDAO.createCart(cart);
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
