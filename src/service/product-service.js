import ProductRepository from "../repository/product-repository.js";

class ProductService {
  // ─────────────────────────────────────────
  // CRUD Base
  // ─────────────────────────────────────────

  async createProduct(data) {
    return await ProductRepository.createProduct(data);
  }

  async getProducts(filters) {
    return await ProductRepository.getProducts(filters);
  }

  async getProductById(pid) {
    return await ProductRepository.getProductById(pid);
  }

  async getProductBySku(sku) {
    return await ProductRepository.getProductBySku(sku);
  }

  async updateProduct(pid, data) {
    return await ProductRepository.updateProduct(pid, data);
  }

  async deleteProduct(pid) {
    return await ProductRepository.deleteProduct(pid);
  }

  // ─────────────────────────────────────────
  // Categorías y subcategorías
  // ─────────────────────────────────────────

  async getDistinctCategories() {
    return await ProductRepository.getDistinctCategories();
  }
  async getDistinctSubcategoriesByCategory(categoria) {
    return await ProductRepository.getDistinctSubcategoriesByCategory(
      categoria,
    );
  }

  // ─────────────────────────────────────────
  // Ofertas
  // ─────────────────────────────────────────

  async getSales(limit) {
    return await ProductRepository.getSales(limit);
  }

  async activarOferta(pid, descuento, vence = null) {
    return await ProductRepository.activarOferta(pid, descuento, vence);
  }

  async desactivarOferta(pid) {
    return await ProductRepository.desactivarOferta(pid);
  }

  async limpiarOfertasVencidas() {
    return await ProductRepository.limpiarOfertasVencidas();
  }
}

export default new ProductService();
