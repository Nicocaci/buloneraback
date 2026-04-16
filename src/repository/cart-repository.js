import cartDAO from "../dao/cart-dao.js";

class CartRepository {
  async createCart(cart) {
    return await cartDAO.createCart(cart);
  }
  async getCartById(id) {
    return await cartDAO.getCartById(id);
  }
  async updateCart(id, cart) {
    return await cartDAO.updateCart(id, cart);
  }
  async deleteCart(id) {
    return await cartDAO.deleteCart(id);
  }
  async getCarts() {
    return await cartDAO.getCarts();
  }
  async addProductToCart(id, product, quantity) {
    return await cartDAO.addProductToCart(id, product, quantity);
  }
  async removeProductFromCart(id, product) {
    return await cartDAO.removeProductFromCart(id, product);
  }
  async updateProductQuantity(id, product, quantity) {
    return await cartDAO.updateProductQuantity(id, product, quantity);
  }
  async clearCart(id) {
    return await cartDAO.clearCart(id);
  }
  async getCartByUserId(userId) {
    return await CartDao.getCartByUserId(userId);
  }

  async createCartForUser(userId) {
    return await CartDao.createCartForUser(userId);
  }

  async saveCart(cart) {
    return await CartDao.saveCart(cart);
  }
}
export default new CartRepository();
