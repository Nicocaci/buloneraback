import ProductRepository from "../repository/product-repository.js";
import {
  buscarIdsProductos,
  calcularFacetas,
  invalidarIndiceBusqueda,
} from "./product-search.js";

// Ejecuta un cambio del admin y descarta la copia de búsqueda para que se vea al instante
const conInvalidacion = async (accion) => {
  const resultado = await accion();
  invalidarIndiceBusqueda();
  return resultado;
};

class ProductService {
  // ─────────────────────────────────────────
  // CRUD Base
  // ─────────────────────────────────────────

  async createProduct(data) {
    return conInvalidacion(() => ProductRepository.createProduct(data));
  }

  async getProducts(filters) {
    if (!filters.search) return await ProductRepository.getProducts(filters);
    const idsBusqueda = await buscarIdsProductos(filters.search);
    return await ProductRepository.getProducts({ ...filters, idsBusqueda });
  }

  async getFacetas(filtros) {
    return await calcularFacetas(filtros);
  }

  async getProductById(pid) {
    return await ProductRepository.getProductById(pid);
  }

  async getProductBySku(sku) {
    return await ProductRepository.getProductBySku(sku);
  }

  async updateProduct(pid, data) {
    return conInvalidacion(() => ProductRepository.updateProduct(pid, data));
  }

  async deleteProduct(pid) {
    return conInvalidacion(() => ProductRepository.deleteProduct(pid));
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
    return conInvalidacion(() => ProductRepository.activarOferta(pid, descuento, vence));
  }

  async desactivarOferta(pid) {
    return conInvalidacion(() => ProductRepository.desactivarOferta(pid));
  }

  async limpiarOfertasVencidas() {
    return conInvalidacion(() => ProductRepository.limpiarOfertasVencidas());
  }
}

export default new ProductService();
