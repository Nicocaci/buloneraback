import ProductService from "../service/product-service.js";
import ProductModel from "../dao/models/product-model.js";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import cloudinary from "../config/cloudinary.js";

// Función auxiliar fuera de la clase para no depender de `this`
const deleteImageFromDisk = (imageName) => {
  const rutaCompleta = path.join("uploads", imageName);
  if (fs.existsSync(rutaCompleta)) {
    try {
      fs.unlinkSync(rutaCompleta);
    } catch (error) {
      console.error("Error al borrar imagen:", rutaCompleta, error);
    }
  }
};

class ProductController {
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
        oferta,
      } = req.body;

      // 🔹 Parseo de oferta (por si viene como string)
      const ofertaParsed = oferta === "true" || oferta === true;

      // 🔹 Validaciones
      if (!item || !descripcion || !categoria || !precio) {
        return res.status(400).json({
          message: "Faltan campos requeridos",
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          message: "Se requiere al menos una imagen",
        });
      }

      // 🔹 Subida a Cloudinary (en paralelo)
      const uploads = req.files.map((file) =>
        cloudinary.uploader.upload(file.path, {
          folder: "products",
        }),
      );

      const results = await Promise.all(uploads);

      const imagenes = results.map((r) => r.secure_url);

      // 🔹 Borrar archivos locales
      req.files.forEach((file) => {
        fs.unlinkSync(file.path);
      });

      // 🔹 Crear producto
      const newProduct = await ProductService.createProduct({
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
        oferta: ofertaParsed,
        imagen: imagenes,
      });

      return res.status(201).json({
        message: "Producto creado",
        newProduct,
      });
    } catch (error) {
      if (error.message?.includes("Código de producto duplicado")) {
        return res.status(409).json({
          message: error.message,
        });
      }

      return res.status(500).json({
        message: "Error al crear producto",
        error: error.message,
      });
    }
  }

  async updateProduct(req, res) {
    const pid = req.params.pid;

    if (!mongoose.Types.ObjectId.isValid(pid)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    try {
      const product = await ProductService.getProductById(pid);

      if (!product) {
        return res.status(404).json({ message: "No existe el producto" });
      }

      const nuevasImagenes = req.files?.map((file) => file.path) || [];

      const data = {
        ...req.body,
        precio: req.body.precio ? Number(req.body.precio) : undefined,
        stock: req.body.stock ? Number(req.body.stock) : undefined,
      };

      // 🚫 nunca permitir imagen desde body
      delete data.imagen;

      if (nuevasImagenes.length > 0) {
        if (Array.isArray(product.imagen)) {
          product.imagen.forEach((img) => deleteImageFromDisk(img));
        }
        data.imagen = nuevasImagenes;
      }

      const updatedProduct = await ProductService.updateProduct(pid, data);

      return res.status(200).json({
        message: "Producto actualizado",
        product: updatedProduct,
      });
    } catch (error) {
      console.error("UPDATE ERROR:", error);
      return res.status(500).json({
        message: "Error al actualizar",
        error: error.message,
      });
    }
  }

  async deleteProduct(req, res) {
    const pid = req.params.pid;

    if (!mongoose.Types.ObjectId.isValid(pid)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    try {
      const product = await ProductService.getProductById(pid);

      if (!product) {
        return res.status(404).json({
          message: "Producto no encontrado",
        });
      }

      // Borrar todas las imágenes del array (usamos la función auxiliar, no `this`)
      if (product.imagen && Array.isArray(product.imagen)) {
        product.imagen.forEach((img) => deleteImageFromDisk(img));
      }

      await ProductService.deleteProduct(pid);

      return res.status(200).json({
        message: "Producto eliminado",
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Error al eliminar producto",
        error: error.message,
      });
    }
  }

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
      } = req.query;

      const result = await ProductService.getProducts({
        page: Number(page),
        limit: Number(limit),
        search,
        category,
        subcategory,
        marca,
        sort,
      });

      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({
        message: "Error al obtener productos",
        error: error.message,
      });
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
    } catch (err) {
      return res
        .status(500)
        .json({
          message: "Error al obtener producto por SKU",
          error: err.message,
        });
    }
  }
  async getProductById(req, res) {
    const pid = req.params.pid;
    if (!mongoose.Types.ObjectId.isValid(pid)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    try {
      const product = await ProductService.getProductById(pid);
      if (!product) {
        return res.status(404).json({ message: "Producto no encontrado" });
      }
      return res.status(200).json(product);
    } catch (error) {
      return res.status(500).json({
        message: "Error al obtener el producto",
        error: error.message,
      });
    }
  }

  async getProductByBrand(req, res) {
    const brand = req.params.brand;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (!brand) {
      return res.status(400).json({ message: "Marca requerida" });
    }

    try {
      const result = await ProductService.getProductByBrand(brand, page, limit);
      if (!result.products.length) {
        return res.status(404).json({
          message: "No se encontró ningún producto con esa marca",
        });
      }
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
      return res.status(500).json({
        message: "Error al obtener categorías",
        error: error.message,
      });
    }
  }
  async getProductBySubCategory(req, res) {
    const subcategory = req.params.subcategory;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (!subcategory) {
      return res.status(400).json({ message: "Subcategoría requerida" });
    }

    // Validar que page y limit sean números positivos
    if (page < 1 || limit < 1) {
      return res.status(400).json({
        message: "Los parámetros 'page' y 'limit' deben ser números positivos",
      });
    }

    try {
      const result = await ProductService.getProductBySubCategory(
        subcategory,
        page,
        limit,
      );
      if (!result.products.length) {
        return res.status(404).json({
          message: "No se encontró ningún producto con esa subcategoría",
        });
      }
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({
        message: "Error al obtener productos por subcategoría",
        error: error.message,
      });
    }
  }
  async getSubCategories(req, res) {
    try {
      const { category } = req.params;

      const subcategories = await ProductModel.distinct("subcategoria", {
        categoria: category,
      });

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
      return res.status(500).json({
        message: "Error al obtener Productos en oferta",
        error: error.message,
      });
    }
  }
}

export default new ProductController();
