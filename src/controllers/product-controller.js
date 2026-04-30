import ProductService from "../service/product-service.js";
import fs from "fs";
import mongoose from "mongoose";
import cloudinary from "../config/cloudinary.js";

// ─────────────────────────────────────────
// Helper: subir archivos a Cloudinary
// ─────────────────────────────────────────
const uploadToCloudinary = async (files) => {
  const uploads = files.map((file) =>
    cloudinary.uploader.upload(file.path, { folder: "products" }),
  );
  const results = await Promise.all(uploads);
  // Borrar archivos temporales locales
  files.forEach((file) => {
    try {
      fs.unlinkSync(file.path);
    } catch (_) {}
  });
  return results.map((r) => r.secure_url);
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
      console.error("Error al borrar imagen de Cloudinary:", url, err);
    }
  }
};

class ProductController {
  // ─────────────────────────────────────────
  // Crear producto
  // ─────────────────────────────────────────
  async createProduct(req, res) {
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
      } = req.body;

      if (!item || !descripcion || !categoria || !precio || !sku) {
        return res.status(400).json({ message: "Faltan campos requeridos" });
      }

      if (!req.files || req.files.length === 0) {
        return res
          .status(400)
          .json({ message: "Se requiere al menos una imagen" });
      }

      const imagenes = await uploadToCloudinary(req.files);

      // Parseo de oferta como objeto (no booleano)
      let oferta = { activa: false, descuento: 0, vence: null };
      if (req.body.oferta) {
        try {
          oferta =
            typeof req.body.oferta === "string"
              ? JSON.parse(req.body.oferta)
              : req.body.oferta;
        } catch (_) {
          return res
            .status(400)
            .json({ message: "Formato de oferta inválido" });
        }
      }

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
        imagen: imagenes,
      });

      return res.status(201).json({ message: "Producto creado", newProduct });
    } catch (error) {
      if (error.message?.includes("SKU")) {
        return res.status(409).json({ message: error.message });
      }
      return res
        .status(500)
        .json({ message: "Error al crear producto", error: error.message });
    }
  }

  // ─────────────────────────────────────────
  // Actualizar producto
  // ─────────────────────────────────────────
  async updateProduct(req, res) {
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
      delete data.imagen; // nunca desde body

      // Parseo de oferta si viene en body
      if (data.oferta && typeof data.oferta === "string") {
        try {
          data.oferta = JSON.parse(data.oferta);
        } catch (_) {
          return res
            .status(400)
            .json({ message: "Formato de oferta inválido" });
        }
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
      console.error("UPDATE ERROR:", error);
      return res
        .status(500)
        .json({ message: "Error al actualizar", error: error.message });
    }
  }

  // ─────────────────────────────────────────
  // Eliminar producto
  // ─────────────────────────────────────────
  async deleteProduct(req, res) {
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
      return res
        .status(500)
        .json({ message: "Error al eliminar producto", error: error.message });
    }
  }

  // ─────────────────────────────────────────
  // Getters
  // ─────────────────────────────────────────
  async getProducts(req, res) {
    try {
      const {
        page = 1,
        limit = 6,
        search,
        category,
        subcategory,
        marca,
        sort,
        soloOfertas,
      } = req.query;

      const result = await ProductService.getProducts({
        page: Number(page),
        limit: Number(limit),
        search,
        category,
        subcategory,
        marca,
        sort,
        soloOfertas: soloOfertas === "true",
      });

      return res.status(200).json(result);
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Error al obtener productos", error: error.message });
    }
  }

  async getProductById(req, res) {
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
      return res
        .status(500)
        .json({ message: "Error al obtener producto", error: error.message });
    }
  }

  async getProductBySku(req, res) {
    const sku = (req.params.sku || "").trim();
    if (!sku) return res.status(400).json({ message: "SKU requerido" });
    try {
      const product = await ProductService.getProductBySku(sku);
      if (!product)
        return res.status(404).json({ message: "Producto no encontrado" });
      return res.status(200).json(product);
    } catch (error) {
      return res.status(500).json({
        message: "Error al obtener producto por SKU",
        error: error.message,
      });
    }
  }

  async getProductByBrand(req, res) {
    const { brand } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    if (!brand) return res.status(400).json({ message: "Marca requerida" });
    try {
      const result = await ProductService.getProductByBrand(brand, page, limit);
      if (!result.products.length)
        return res
          .status(404)
          .json({ message: "No se encontraron productos con esa marca" });
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({
        message: "Error al obtener productos por marca",
        error: error.message,
      });
    }
  }

  async getProductByCategory(req, res) {
    try {
      const categories = await ProductService.getDistinctCategories();
      return res.status(200).json(categories);
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Error al obtener categorías", error: error.message });
    }
  }

  async getProductBySubCategory(req, res) {
    const { subcategory } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    if (!subcategory)
      return res.status(400).json({ message: "Subcategoría requerida" });
    if (page < 1 || limit < 1)
      return res
        .status(400)
        .json({ message: "'page' y 'limit' deben ser positivos" });
    try {
      const result = await ProductService.getProductBySubCategory(
        subcategory,
        page,
        limit,
      );
      if (!result.products.length)
        return res.status(404).json({
          message: "No se encontraron productos con esa subcategoría",
        });
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({
        message: "Error al obtener productos por subcategoría",
        error: error.message,
      });
    }
  }

  async getSubCategories(req, res) {
    const { category } = req.params;
    try {
      const subcategories =
        await ProductService.getDistinctSubcategoriesByCategory(category);
      return res.status(200).json(subcategories);
    } catch (error) {
      return res.status(500).json({
        message: "Error al obtener subcategorías",
        error: error.message,
      });
    }
  }

  async getSales(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const sales = await ProductService.getSales(limit);
      return res.status(200).json(sales);
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Error al obtener ofertas", error: error.message });
    }
  }

  // ─────────────────────────────────────────
  // Ofertas
  // ─────────────────────────────────────────

  async activarOferta(req, res) {
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
      const updated = await ProductService.activarOferta(
        pid,
        Number(descuento),
        vence || null,
      );
      return res
        .status(200)
        .json({ message: "Oferta activada", product: updated });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Error al activar oferta", error: error.message });
    }
  }

  async desactivarOferta(req, res) {
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
      return res
        .status(500)
        .json({ message: "Error al desactivar oferta", error: error.message });
    }
  }

  async limpiarOfertasVencidas(req, res) {
    try {
      const count = await ProductService.limpiarOfertasVencidas();
      return res
        .status(200)
        .json({ message: `${count} ofertas vencidas limpiadas` });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Error al limpiar ofertas", error: error.message });
    }
  }
}

export default new ProductController();
