import ProductRepository from "../repository/product-repository.js";
import ProductModel from "../dao/models/product-model.js";

class ProductService {
  async createProduct(data) {
    return await ProductRepository.createProduct(data);
  }
  async getProducts(filters) {
    return await ProductRepository.getProducts(filters);
  }
  async getProductBySku(sku) {
    return await ProductRepository.getProductBySku(sku);
  }
  async getProductById(pid) {
    return await ProductRepository.getProductById(pid);
  }
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
  async updateProduct(pid, data) {
    return await ProductRepository.updateProduct(pid, data);
  }
  async deleteProduct(pid) {
    return await ProductRepository.deleteProduct(pid);
  }
  async getSubCategories() {
    return await ProductRepository.getSubCategories();
  }
  async getProductsWithFilters({ search, category, subcategory }) {
    const query = {};

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    if (category) {
      query.categoria = category;
    }

    if (subcategory) {
      query.subcategoria = subcategory;
    }

    return await ProductModel.find(query);
  }
  async getDistinctCategories() {
    return await ProductModel.distinct("categoria");
  }
  async getDistinctSubcategoriesByCategory(categoria) {
    return await ProductRepository.getDistinctSubcategoriesByCategory(
      categoria,
    );
  }
  async getProductsWithFilters({ page, limit, filters, sort }) {
    const skip = (page - 1) * limit;

    let sortOptions = {};
    if (sort === "price_asc") sortOptions.price = 1;
    if (sort === "price_desc") sortOptions.price = -1;

    const products = await ProductModel.find(filters)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    const total = await ProductModel.countDocuments(filters);

    return {
      products,
      pagination: {
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
    };
  }
  async getSales(limit) {
    return await ProductRepository.getSales(limit);
  }
}
export default new ProductService();
