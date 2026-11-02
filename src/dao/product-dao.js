import ProductModel, {
  calcularPrecioConIva,
  calcularPrecioFinal,
  isOfertaVigente,
} from "./models/product-model.js";
import AppError from "../utils/app-error.js";
import { escapeRegex } from "../utils/validators.js";

class ProductDao {
  // ─────────────────────────────────────────
  // Helpers privados
  // ─────────────────────────────────────────

  /**
   * Agrega los campos virtuales manualmente sobre resultados .lean()
   * Necesario porque .lean() omite los virtuals del schema.
   * Una oferta vencida ya no descuenta (antes seguía descontando hasta limpiarla a mano).
   */
  _addVirtuals(product) {
    return {
      ...product,
      precioConIva: calcularPrecioConIva(product.precio, product.iva),
      precioFinal: calcularPrecioFinal(product.precio, product.iva, product.oferta),
      ofertaVigente: isOfertaVigente(product.oferta),
    };
  }

  // ─────────────────────────────────────────
  // CRUD Base
  // ─────────────────────────────────────────

  async createProduct(data) {
    const existingProduct = await ProductModel.findOne({ sku: data.sku });
    if (existingProduct) {
      throw new AppError(409, `Ya existe un producto con el SKU: ${data.sku}`);
    }
    try {
      return await ProductModel.create(data);
    } catch (error) {
      if (error.code === 11000) {
        throw new AppError(409, `Ya existe un producto con el SKU: ${data.sku}`);
      }
      throw error;
    }
  }

  async getProducts(filters = {}) {
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
      soloOfertas = false, // filtrar solo productos en oferta vigente
      vista, // "resumen": para tarjetas y buscador, sin la descripción (texto largo)
      idsBusqueda, // resultado de la búsqueda (product-search.js), del más relevante al menos
    } = filters;

    const skip = (page - 1) * limit;
    const query = { estado: "activo" };
    query.$and = [];

    // 🔍 BÚSQUEDA: si viene resuelta por product-search.js se filtra por esos IDs
    if (idsBusqueda) {
      query._id = { $in: idsBusqueda };
    } else if (search) {
      const escaped = escapeRegex(search);
      query.$and.push({
        $or: [
          { item: { $regex: escaped, $options: "i" } },
          { categoria: { $regex: escaped, $options: "i" } },
          { subcategoria: { $regex: escaped, $options: "i" } },
          { marca: { $regex: escaped, $options: "i" } },
          { sku: { $regex: escaped, $options: "i" } },
        ],
      });
    }

    // 📦 FILTROS
    if (category) query.categoria = category;
    if (subcategory) query.subcategoria = subcategory;
    if (marca) query.marca = { $regex: escapeRegex(marca), $options: "i" };

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
      query.$and.push({
        $or: [
          { "oferta.vence": null },
          { "oferta.vence": { $gt: new Date() } },
        ],
      });
    }

    // Si no se usó $and, lo eliminamos para no ensuciar la query
    if (query.$and.length === 0) delete query.$and;

    // 📊 ORDEN
    let sortOption = {};
    if (sort === "price_asc") sortOption.precio = 1;
    if (sort === "price_desc") sortOption.precio = -1;
    if (sort === "descuento_desc") sortOption["oferta.descuento"] = -1;
    // Desempate por _id: sin un orden único, MongoDB puede devolver el mismo producto
    // en dos páginas (o saltearse uno) cuando hay precios o descuentos repetidos.
    sortOption._id = 1;

    const proyeccion = vista === "resumen" ? { descripcion: 0 } : {};

    // Búsqueda sin un orden elegido: se respeta la relevancia. Son pocos productos,
    // así que se traen todos los que coinciden y se pagina acá.
    if (idsBusqueda && !sort) {
      const posicion = new Map(idsBusqueda.map((id, i) => [String(id), i]));
      const todos = await ProductModel.find(query, proyeccion).lean();
      todos.sort((a, b) => posicion.get(String(a._id)) - posicion.get(String(b._id)));
      return {
        products: todos.slice(skip, skip + Number(limit)).map((p) => this._addVirtuals(p)),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: todos.length,
          totalPages: Math.max(1, Math.ceil(todos.length / limit)),
        },
      };
    }

    const [rawProducts, total] = await Promise.all([
      ProductModel.find(query, proyeccion)
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
  }

  // Devuelve null si no existe (los controllers responden 404).
  async getProductById(pid) {
    const product = await ProductModel.findById(pid).lean();
    return product ? this._addVirtuals(product) : null;
  }

  async updateProduct(pid, data) {
    const updated = await ProductModel.findByIdAndUpdate(pid, data, {
      new: true,
      runValidators: true,
    }).lean();
    if (!updated) throw new AppError(404, "Producto no encontrado");
    return this._addVirtuals(updated);
  }

  async deleteProduct(pid) {
    const deleted = await ProductModel.findByIdAndDelete(pid);
    if (!deleted) throw new AppError(404, "Producto no encontrado");
    return deleted;
  }}

export default new ProductDao();
