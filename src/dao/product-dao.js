import ProductModel from "./models/product-model.js";

class ProductDao {
    async createProduct(data) {
        try {
            // Verificar si ya existe un producto con el mismo SKU
            const existingProduct = await ProductModel.findOne({ sku: data.sku });
            if (existingProduct) {
                throw new Error(`Ya existe un producto con el SKU: ${data.sku}`);
            }

            const newProduct = await ProductModel.create(data);
            return newProduct;
        } catch (error) {
            // Si es un error de MongoDB por duplicado (código 11000)
            if (error.code === 11000 || error.code === 11001) {
                throw new Error(`Ya existe un producto con el SKU: ${data.sku}`);
            }
            throw error;
        }
    }
    async getProducts(page = 1, limit = 10, q = '') {
        try {
            const skip = (page - 1) * limit;

            // Sanitizar y limitar la longitud de la búsqueda
            const rawQ = String(q || '').trim().slice(0, 100);
            // Escapar caracteres especiales para usar en regex
            const escaped = rawQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            const filter = escaped ? { item: { $regex: escaped, $options: 'i' } } : {};

            const products = await ProductModel.find(filter)
                .skip(skip)
                .limit(parseInt(limit, 10));

            const total = await ProductModel.countDocuments(filter);

            return {
                products,
                pagination: {
                    page: parseInt(page, 10),
                    limit: parseInt(limit, 10),
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            throw error;
        }
    }

    async getProductBySku(sku) {
        try {
            const escapeRegex = (text) => {
                return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            };
            const cleanSku = String(sku || '').trim();

            if (!cleanSku) return null;
            // Si tu SKU es consistente en DB, preferir exact match:

            const product = await ProductModel.findOne({ sku: { $regex: `^${escapeRegex(cleanSku)}$`, $options: 'i' } }).lean();
            return product;
        } catch (error) {
            throw error;
        }
    }
    async getProductById(pid) {
        try {
            const product = await ProductModel.findById(pid);
            return product;
        } catch (error) {
            throw error;
        }
    }
    async getProductByBrand(marca, page = 1, limit = 10) {
        try {
            const skip = (page - 1) * limit;
            const products = await ProductModel.find({ marca })
                .skip(skip)
                .limit(parseInt(limit));
            const total = await ProductModel.countDocuments({ marca });
            return {
                products,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            throw error;
        }
    }
    async getProductByCategory(categoria, page = 1, limit = 10) {
        try {
            const skip = (page - 1) * limit;
            const products = await ProductModel.find({ categoria })
                .skip(skip)
                .limit(parseInt(limit));
            const total = await ProductModel.countDocuments({ categoria });
            return {
                products,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            throw error;
        }
    }
    async getProductBySubCategory(subcategoria, page = 1, limit = 10) {
        try {
            const skip = (page - 1) * limit;
            const products = await ProductModel.find({ subcategoria })
                .skip(skip)
                .limit(parseInt(limit));
            const total = await ProductModel.countDocuments({ subcategoria });
            return {
                products,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            throw error;
        }
    }
    async updateProduct(pid, data) {
        try {
            const updateProduct = await ProductModel.findByIdAndUpdate(pid, data, { new: true });
            if (!updateProduct) {
                throw new Error('Producto no encontrado');
            }
            return updateProduct;
        } catch (error) {
            throw error;
        }
    }
    async deleteProduct(pid) {
        try {
            const product = await ProductModel.findByIdAndDelete(pid);
            if (!product) {
                throw new Error('Producto no encontrado');
            }
            return product;
        } catch (error) {
            throw error;
        }
    }
    async getSubCategories() {
        try {
            const subcategories = await ProductModel.distinct('subcategoria');
            return subcategories;
        } catch (error) {
            throw error;
        }
    }
}

export default new ProductDao();