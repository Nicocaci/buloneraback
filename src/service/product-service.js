import ProductRepository from "../repository/product-repository.js";
import ProductModel from "../dao/models/product-model.js";

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
  // Filtros de conveniencia
  // ─────────────────────────────────────────

  async getProductByBrand(marca, page, limit) {
    return await ProductRepository.getProductByBrand(marca, page, limit);
  }

  async getProductByCategory(categoria, page, limit) {
    return await ProductRepository.getProductByCategory(categoria, page, limit);
  }

  async getProductBySubCategory(subcategoria, page, limit) {
    return await ProductRepository.getProductBySubCategory(
      subcategoria,
      page,
      limit,
    );
  }

  // ─────────────────────────────────────────
  // Categorías y subcategorías
  // ─────────────────────────────────────────

  async getDistinctCategories() {
    return await ProductModel.distinct("categoria");
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
