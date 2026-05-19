import ProductModel from "./models/product-model.js";

class ProductDao {
  // ─────────────────────────────────────────
  // Helpers privados
  // ─────────────────────────────────────────

  /**
   * Agrega los campos virtuales manualmente sobre resultados .lean()
   * Necesario porque .lean() omite los virtuals del schema.
   */
  _addVirtuals(product) {
    const precioConIva = Math.round(product.precio * (1 + product.iva / 100));
    const oferta = product.oferta;

    const precioFinal =
      !oferta?.activa || oferta?.descuento === 0
        ? precioConIva
        : Math.round(precioConIva * (1 - oferta.descuento / 100));

    return { ...product, precioConIva, precioFinal };
  }

  /**
   * Filtra ofertas vencidas: si oferta.activa pero ya venció, la normaliza.
   * Útil para no mostrar descuentos caducos sin necesidad de un cron job.
   */
  _isOfertaVigente(oferta) {
    if (!oferta?.activa || oferta?.descuento === 0) return false;
    if (!oferta?.vence) return true;
    return new Date(oferta.vence) > new Date();
  }

  // ─────────────────────────────────────────
  // CRUD Base
  // ─────────────────────────────────────────

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

  async getProducts(filters = {}) {
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
        soloOfertas = false, // nuevo: filtrar solo productos en oferta vigente
      } = filters;

      const skip = (page - 1) * limit;
      const query = { estado: "activo" };

      // 🔍 BÚSQUEDA GLOBAL
      if (search) {
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        query.$or = [
          { item: { $regex: escaped, $options: "i" } },
          { categoria: { $regex: escaped, $options: "i" } },
          { subcategoria: { $regex: escaped, $options: "i" } },
          { marca: { $regex: escaped, $options: "i" } },
        ];
      }

      // 📦 FILTROS
      if (category) query.categoria = category;
      if (subcategory) query.subcategoria = subcategory;
      if (marca) query.marca = { $regex: marca, $options: "i" };

      // 💰 PRECIO BASE
      if (minPrice || maxPrice) {
        query.precio = {};
        if (minPrice) query.precio.$gte = Number(minPrice);
        if (maxPrice) query.precio.$lte = Number(maxPrice);
      }

      // 🏷️ SOLO OFERTAS VIGENTES
      if (soloOfertas) {
        query["oferta.activa"] = true;
        query["oferta.descuento"] = { $gt: 0 };
        query.$or = [
          { "oferta.vence": null },
          { "oferta.vence": { $gt: new Date() } },
        ];
      }

      // 📊 ORDEN
      let sortOption = {};
      if (sort === "price_asc") sortOption.precio = 1;
      if (sort === "price_desc") sortOption.precio = -1;
      if (sort === "descuento_desc") sortOption["oferta.descuento"] = -1;

      const [rawProducts, total] = await Promise.all([
        ProductModel.find(query)
          .sort(sortOption)
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        ProductModel.countDocuments(query),
      ]);

      // Inyectar virtuals manualmente (lean() los omite)
      const products = rawProducts.map((p) => this._addVirtuals(p));

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
      return this._addVirtuals(product);
    } catch (error) {
      throw error;
    }
  }

  async getProductBySku(sku) {
    try {
      const escaped = sku.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const product = await ProductModel.findOne({
        sku: { $regex: `^${escaped}$`, $options: "i" },
      }).lean();
      return product ? this._addVirtuals(product) : null;
    } catch (error) {
      throw error;
    }
  }

  async updateProduct(pid, data) {
    try {
      const updated = await ProductModel.findByIdAndUpdate(pid, data, {
        new: true,
        runValidators: true,
      }).lean();
      if (!updated) throw new Error("Producto no encontrado");
      return this._addVirtuals(updated);
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

  // ─────────────────────────────────────────
  // Categorías y subcategorías
  // ─────────────────────────────────────────

  async getSubCategories() {
    try {
      return await ProductModel.distinct("subcategoria");
    } catch (error) {
      throw error;
    }
  }
  async getDistinctCategories() {
    const result = await ProductModel.aggregate([
      { $match: { categoria: { $exists: true, $ne: null, $ne: "" } } },
      {
        $group: {
          _id: { $toLower: { $trim: { input: "$categoria" } } },
          label: { $first: { $trim: { input: "$categoria" } } },
        },
      },
      { $sort: { label: 1 } },
    ]);
    return result.map((r) => r.label);
  }

  async getDistinctSubcategoriesByCategory(categoria) {
    try {
      return await ProductModel.distinct("subcategoria", { categoria });
    } catch (error) {
      throw error;
    }
  }

  // ─────────────────────────────────────────
  // Ofertas
  // ─────────────────────────────────────────

  /**
   * Devuelve productos con oferta activa y vigente.
   * Reemplaza el getSales() anterior que filtraba mal.
   */
  async getSales(limit = 10) {
    try {
      const now = new Date();
      const rawProducts = await ProductModel.find({
        estado: "activo",
        "oferta.activa": true,
        "oferta.descuento": { $gt: 0 },
        $or: [{ "oferta.vence": null }, { "oferta.vence": { $gt: now } }],
      })
        .sort({ "oferta.descuento": -1 }) // mayor descuento primero
        .limit(limit)
        .lean();

      return rawProducts.map((p) => this._addVirtuals(p));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Activa o actualiza la oferta de un producto.
   * @param {string} pid - ID del producto
   * @param {number} descuento - Porcentaje de descuento (0-100)
   * @param {Date|null} vence - Fecha de vencimiento (opcional)
   */
  async activarOferta(pid, descuento, vence = null) {
    try {
      if (descuento < 0 || descuento > 100) {
        throw new Error("El descuento debe estar entre 0 y 100");
      }

      const updated = await ProductModel.findByIdAndUpdate(
        pid,
        {
          $set: {
            "oferta.activa": true,
            "oferta.descuento": descuento,
            "oferta.vence": vence ? new Date(vence) : null,
          },
        },
        { new: true, runValidators: true },
      ).lean();

      if (!updated) throw new Error("Producto no encontrado");
      return this._addVirtuals(updated);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Desactiva la oferta de un producto y resetea sus valores.
   */
  async desactivarOferta(pid) {
    try {
      const updated = await ProductModel.findByIdAndUpdate(
        pid,
        {
          $set: {
            "oferta.activa": false,
            "oferta.descuento": 0,
            "oferta.vence": null,
          },
        },
        { new: true },
      ).lean();

      if (!updated) throw new Error("Producto no encontrado");
      return this._addVirtuals(updated);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Limpia automáticamente las ofertas vencidas (para usar con un cron job).
   * Retorna la cantidad de productos actualizados.
   */
  async limpiarOfertasVencidas() {
    try {
      const result = await ProductModel.updateMany(
        {
          "oferta.activa": true,
          "oferta.vence": { $lte: new Date() },
        },
        {
          $set: {
            "oferta.activa": false,
            "oferta.descuento": 0,
            "oferta.vence": null,
          },
        },
      );
      return result.modifiedCount;
    } catch (error) {
      throw error;
    }
  }
}

export default new ProductDao();
