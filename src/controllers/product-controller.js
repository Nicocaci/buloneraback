import ProductService from "../service/product-service.js";
import mongoose from "mongoose";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";
import { queryString } from "../utils/validators.js";

const MAX_LIMIT = 48;

const toPage = (value) => Math.max(parseInt(value, 10) || 1, 1);
const toLimit = (value, fallback) =>
  Math.min(Math.max(parseInt(value, 10) || fallback, 1), MAX_LIMIT);

// ─────────────────────────────────────────
// Helper: subir archivos a Cloudinary
// ─────────────────────────────────────────
const uploadToCloudinary = (files) => {
  const uploads = files.map((file) => {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "products" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      );
      streamifier.createReadStream(file.buffer).pipe(stream);
    });
  });
  return Promise.all(uploads).then((results) =>
    results.map((r) => r.secure_url),
  );
};

// ─────────────────────────────────────────
// Helper: borrar imágenes de Cloudinary
// ─────────────────────────────────────────
const deleteFromCloudinary = async (urls = []) => {
  for (const url of urls) {
    try {
      // Extraer public_id desde la URL: .../products/nombre.jpg → products/nombre
      const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/i);
      if (match) await cloudinary.uploader.destroy(match[1]);
    } catch (err) {
      console.error("Error al borrar imagen de Cloudinary:", url, err.message);
    }
  }
};

const parseOferta = (value) => {
  if (!value) return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null; // null = formato inválido
  }
};

class ProductController {
  // ─────────────────────────────────────────
  // Crear producto
  // ─────────────────────────────────────────
  async createProduct(req, res, next) {
    try {
      const {
        sku,
        item,
        descripcion,
        marca,
        categoria,
        subcategoria,
        precio,
        iva,
        stock,
        estado,
        peso,
        alto,
        ancho,
        largo,
      } = req.body;

      if (!item || !descripcion || !categoria || !precio || !sku) {
        return res.status(400).json({ message: "Faltan campos requeridos" });
      }

      if (!req.files || req.files.length === 0) {
        return res
          .status(400)
          .json({ message: "Se requiere al menos una imagen" });
      }

      let oferta = { activa: false, descuento: 0, vence: null };
      if (req.body.oferta) {
        const parsed = parseOferta(req.body.oferta);
        if (parsed === null) {
          return res.status(400).json({ message: "Formato de oferta inválido" });
        }
        oferta = parsed;
      }

      const imagenes = await uploadToCloudinary(req.files);

      const newProduct = await ProductService.createProduct({
        sku,
        item,
        descripcion,
        marca,
        categoria,
        subcategoria,
        precio: Number(precio),
        iva: Number(iva || 0),
        stock: Number(stock),
        estado,
        oferta,
        peso: Number(peso || 0),
        alto: Number(alto || 0),
        ancho: Number(ancho || 0),
        largo: Number(largo || 0),
        imagen: imagenes,
      });

      return res.status(201).json({ message: "Producto creado", newProduct });
    } catch (error) {
      next(error);
    }
  }

  // ─────────────────────────────────────────
  // Actualizar producto
  // ─────────────────────────────────────────
  async updateProduct(req, res, next) {
    const { pid } = req.params;

    if (!mongoose.Types.ObjectId.isValid(pid)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    try {
      const product = await ProductService.getProductById(pid);
      if (!product)
        return res.status(404).json({ message: "Producto no encontrado" });

      const data = { ...req.body };
      if (data.precio !== undefined) data.precio = Number(data.precio);
      if (data.stock !== undefined) data.stock = Number(data.stock);
      if (data.iva !== undefined) data.iva = Number(data.iva);
      // Nunca desde el body: imágenes, identificadores ni campos calculados
      delete data.imagen;
      delete data._id;
      delete data.id;
      delete data.__v;

      if (data.oferta !== undefined) {
        const parsed = parseOferta(data.oferta);
        if (parsed === null) {
          return res.status(400).json({ message: "Formato de oferta inválido" });
        }
        data.oferta = parsed;
      }

      // Si vienen nuevas imágenes, borrar las viejas de Cloudinary y subir nuevas
      if (req.files && req.files.length > 0) {
        await deleteFromCloudinary(product.imagen || []);
        data.imagen = await uploadToCloudinary(req.files);
      }

      const updatedProduct = await ProductService.updateProduct(pid, data);

      return res
        .status(200)
        .json({ message: "Producto actualizado", product: updatedProduct });
    } catch (error) {
      next(error);
    }
  }

  // ─────────────────────────────────────────
  // Eliminar producto
  // ─────────────────────────────────────────
  async deleteProduct(req, res, next) {
    const { pid } = req.params;

    if (!mongoose.Types.ObjectId.isValid(pid)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    try {
      const product = await ProductService.getProductById(pid);
      if (!product)
        return res.status(404).json({ message: "Producto no encontrado" });

      await deleteFromCloudinary(product.imagen || []);
      await ProductService.deleteProduct(pid);

      return res.status(200).json({ message: "Producto eliminado" });
    } catch (error) {
      next(error);
    }
  }

  // ─────────────────────────────────────────
  // Getters
  // ─────────────────────────────────────────
  async getProducts(req, res, next) {
    try {
      const { page, limit, soloOfertas } = req.query;

      const result = await ProductService.getProducts({
        page: toPage(page),
        limit: toLimit(limit, 8),
        search: queryString(req.query.search),
        category: queryString(req.query.category),
        subcategory: queryString(req.query.subcategory),
        marca: queryString(req.query.marca),
        sort: queryString(req.query.sort),
        soloOfertas: soloOfertas === "true",
        vista: req.query.vista === "resumen" ? "resumen" : undefined,
      });

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getProductById(req, res, next) {
    const { pid } = req.params;
    if (!mongoose.Types.ObjectId.isValid(pid)) {
      return res.status(400).json({ message: "ID inválido" });
    }
    try {
      const product = await ProductService.getProductById(pid);
      if (!product)
        return res.status(404).json({ message: "Producto no encontrado" });
      return res.status(200).json(product);
    } catch (error) {
      next(error);
    }
  }

  async getProductBySku(req, res, next) {
    const sku = (req.params.sku || "").trim();
    if (!sku) return res.status(400).json({ message: "SKU requerido" });
    try {
      const product = await ProductService.getProductBySku(sku);
      if (!product)
        return res.status(404).json({ message: "Producto no encontrado" });
      return res.status(200).json(product);
    } catch (error) {
      next(error);
    }
  }

  async getCategories(req, res, next) {
    try {
      const categories = await ProductService.getDistinctCategories();
      return res.status(200).json(categories);
    } catch (error) {
      next(error);
    }
  }

  async getSubcategoriesByCategory(req, res, next) {
    try {
      const { category } = req.params;

      const subcategories = await ProductService.getDistinctSubcategoriesByCategory(category);

      return res.status(200).json(subcategories);
    } catch (error) {
      next(error);
    }
  }

  // Cantidades por categoría, subcategoría y marca para el filtro de productos.
  // Acepta los mismos filtros que el listado.
  async getFacetas(req, res, next) {
    try {
      const facetas = await ProductService.getFacetas({
        categoria: queryString(req.query.category),
        subcategoria: queryString(req.query.subcategory),
        marca: queryString(req.query.marca),
        search: queryString(req.query.search),
        soloOfertas: req.query.soloOfertas === "true",
      });
      return res.status(200).json(facetas);
    } catch (error) {
      next(error);
    }
  }

  async getSales(req, res, next) {
    try {
      const sales = await ProductService.getSales(toLimit(req.query.limit, 10));
      return res.status(200).json(sales);
    } catch (error) {
      next(error);
    }
  }

  // ─────────────────────────────────────────
  // Ofertas (solo admin, ver product-router.js)
  // ─────────────────────────────────────────

  async activarOferta(req, res, next) {
    const { pid } = req.params;
    if (!mongoose.Types.ObjectId.isValid(pid)) {
      return res.status(400).json({ message: "ID inválido" });
    }
    try {
      const { descuento, vence } = req.body;
      if (descuento === undefined || descuento === null) {
        return res
          .status(400)
          .json({ message: "El campo 'descuento' es requerido" });
      }
      if (vence && Number.isNaN(new Date(vence).getTime())) {
        return res.status(400).json({ message: "La fecha de vencimiento no es válida" });
      }
      const updated = await ProductService.activarOferta(
        pid,
        Number(descuento),
        vence || null,
      );
      return res
        .status(200)
        .json({ message: "Oferta activada", product: updated });
    } catch (error) {
      next(error);
    }
  }

  async desactivarOferta(req, res, next) {
    const { pid } = req.params;
    if (!mongoose.Types.ObjectId.isValid(pid)) {
      return res.status(400).json({ message: "ID inválido" });
    }
    try {
      const updated = await ProductService.desactivarOferta(pid);
      return res
        .status(200)
        .json({ message: "Oferta desactivada", product: updated });
    } catch (error) {
      next(error);
    }
  }

  async limpiarOfertasVencidas(req, res, next) {
    try {
      const count = await ProductService.limpiarOfertasVencidas();
      return res
        .status(200)
        .json({ message: `${count} ofertas vencidas limpiadas` });
    } catch (error) {
      next(error);
    }
  }
}

export default new ProductController();
