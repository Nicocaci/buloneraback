import ProductModel from "./models/product-model.js";

class ProductDao {
  async createProduct(data) {
    try {
      const existingProduct = await ProductModel.findOne({ sku: data.sku });
      if (existingProduct) {
        throw new Error(`Ya existe un producto con el SKU: ${data.sku}`);
      }

      return await ProductModel.create(data);
    } catch (error) {
      if (error.code === 11000) {
        throw new Error(`Ya existe un producto con el SKU: ${data.sku}`);
      }
      throw error;
    }
  }

  async getProducts(filters) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        category,
        subcategory,
        marca,
        minPrice,
        maxPrice,
        sort,
      } = filters;

      const skip = (page - 1) * limit;
      const query = {};

      // 🔍 BÚSQUEDA GLOBAL
      if (search) {
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        query.$or = [
          { item: { $regex: escaped, $options: "i" } }, // ⚠️ usar el campo correcto
          { categoria: { $regex: escaped, $options: "i" } },
          { subcategoria: { $regex: escaped, $options: "i" } },
          { marca: { $regex: escaped, $options: "i" } },
        ];
      }

      // 📦 FILTROS
      if (category) query.categoria = category;
      if (subcategory) query.subcategoria = subcategory;

      if (marca) {
        query.marca = { $regex: marca, $options: "i" };
      }

      // 💰 PRECIO
      if (minPrice || maxPrice) {
        query.precio = {};
        if (minPrice) query.precio.$gte = Number(minPrice);
        if (maxPrice) query.precio.$lte = Number(maxPrice);
      }

      // 📊 ORDEN
      let sortOption = {};
      if (sort === "price_asc") sortOption.precio = 1;
      if (sort === "price_desc") sortOption.precio = -1;

      const [products, total] = await Promise.all([
        ProductModel.find(query)
          .sort(sortOption)
          .skip(skip)
          .limit(Number(limit))
          .lean(), // 🔥 mejora performance
        ProductModel.countDocuments(query),
      ]);

      return {
        products,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async getProductById(pid) {
    try {
      const product = await ProductModel.findById(pid).lean();
      if (!product) throw new Error("Producto no encontrado");
      return product;
    } catch (error) {
      throw error;
    }
  }

  async getProductBySku(sku) {
    try {
      const escaped = sku.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      return await ProductModel.findOne({
        sku: { $regex: `^${escaped}$`, $options: "i" },
      }).lean();
    } catch (error) {
      throw error;
    }
  }

  async updateProduct(pid, data) {
    try {
      const updated = await ProductModel.findByIdAndUpdate(pid, data, {
        new: true,
      }).lean();

      if (!updated) throw new Error("Producto no encontrado");

      return updated;
    } catch (error) {
      throw error;
    }
  }

  async deleteProduct(pid) {
    try {
      const deleted = await ProductModel.findByIdAndDelete(pid);

      if (!deleted) throw new Error("Producto no encontrado");

      return deleted;
    } catch (error) {
      throw error;
    }
  }

  async getSubCategories() {
    try {
      return await ProductModel.distinct("subcategoria");
    } catch (error) {
      throw error;
    }
  }

  async getDistinctSubcategoriesByCategory(categoria) {
    try {
      return await ProductModel.distinct("subcategoria", { categoria });
    } catch (error) {
      throw error;
    }
  }
  async getSales(limit = 10) {
    try {
      const oferta = 
        await ProductModel
        .find({ oferta: true, estado: "activo" })
        .limit(limit)
        .sort({ precio: 1 })
        .lean();
      return oferta;
    } catch (error) {
      throw error;
    }
  }
}

export default new ProductDao();
