import ProductRepository from "../repository/product-repository.js";

class ProductService {
    async createProduct(data){
        return await ProductRepository.createProduct(data);
    }
    async getProducts(page, limit, q = ''){
        return await ProductRepository.getProducts(page, limit, q);
    }
    async getProductBySku(sku) {
        return await ProductRepository.getProductBySku(sku);
    }
    async getProductById(pid){
        return await ProductRepository.getProductById(pid);
    }
    async getProductByBrand(marca, page, limit) {
        return await ProductRepository.getProductByBrand(marca, page, limit);
    }
    async getProductByCategory(categoria, page, limit){
        return await ProductRepository.getProductByCategory(categoria, page, limit);
    }
    async getProductBySubCategory(subcategoria, page, limit){
        return await ProductRepository.getProductBySubCategory(subcategoria, page, limit);
    }
    async updateProduct(pid, data){
        return await ProductRepository.updateProduct(pid,data);
    }
    async deleteProduct(pid){
        return await ProductRepository.deleteProduct(pid);
    }
    async getSubCategories(){
        return await ProductRepository.getSubCategories();
    }
}
export default new ProductService();