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

  async getProductBySku(sku) {
    return await ProductDao.getProductBySku(sku);
  }

  async updateProduct(pid, data) {
    return await ProductDao.updateProduct(pid, data);
  }

  async deleteProduct(pid) {
    return await ProductDao.deleteProduct(pid);
  }

  // ─────────────────────────────────────────
  // Filtros de conveniencia (usan getProducts internamente)
  // ─────────────────────────────────────────

  async getProductByBrand(marca, page = 1, limit = 10) {
    return await ProductDao.getProducts({ marca, page, limit });
  }

  async getProductByCategory(categoria, page = 1, limit = 10) {
    return await ProductDao.getProducts({ category: categoria, page, limit });
  }

  async getProductBySubCategory(subcategoria, page = 1, limit = 10) {
    return await ProductDao.getProducts({
      subcategory: subcategoria,
      page,
      limit,
    });
  }

  // ─────────────────────────────────────────
  // Categorías y subcategorías
  // ─────────────────────────────────────────

  async getSubCategories() {
    return await ProductDao.getSubCategories();
  }
  async getDistinctCategories() {
    return await ProductDao.getDistinctCategories();
  }

  async getDistinctSubcategoriesByCategory(categoria) {
    return await ProductDao.getDistinctSubcategoriesByCategory(categoria);
  }

  // ─────────────────────────────────────────
  // Ofertas
  // ─────────────────────────────────────────

  async getSales(limit) {
    return await ProductDao.getSales(limit);
  }

  async activarOferta(pid, descuento, vence = null) {
    return await ProductDao.activarOferta(pid, descuento, vence);
  }

  async desactivarOferta(pid) {
    return await ProductDao.desactivarOferta(pid);
  }

  async limpiarOfertasVencidas() {
    return await ProductDao.limpiarOfertasVencidas();
  }
}

export default new ProductRepository();
