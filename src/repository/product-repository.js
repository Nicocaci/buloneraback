import ProductDao from "../dao/product-dao.js";

class ProductRepository {
  // ─────────────────────────────────────────
  // CRUD Base
  // ─────────────────────────────────────────

  async createProduct(data) {
    return await ProductDao.createProduct(data);
  }

  async getProducts(filters) {
    return await ProductDao.getProducts(filters);
  }

  async getProductById(pid) {
    return await ProductDao.getProductById(pid);
  }

  async updateProduct(pid, data) {
    return await ProductDao.updateProduct(pid, data);
  }

  async deleteProduct(pid) {
    return await ProductDao.deleteProduct(pid);
  }}

export default new ProductRepository();
