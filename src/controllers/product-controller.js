import ProductService from "../service/product-service.js";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

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
                estado
            } = req.body;

            // 🔹 imágenes subidas con multer (array)
            let imagenes = [];

            if (req.files && req.files.length > 0) {
                imagenes = req.files.map(f => f.filename);
            }

            // ❌ validaciones
            if (!item || !descripcion || !categoria || !precio) {
                return res.status(400).json({
                    message: "Faltan campos requeridos",
                });
            }

            if (!imagenes || imagenes.length === 0) {
                return res.status(400).json({
                    message: "Se requiere al menos una imagen",
                });
            }

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
                imagen: imagenes,  // 👉 coincide con el schema
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

        const data = req.body;

        try {
            const product = await ProductService.getProductById(pid);

            if (!product) {
                return res.status(404).json({ message: "No existe el producto" });
            }

            // Si subieron nuevas imágenes (puede ser 1 o varias)
            const nuevasImagenes = req.files?.imagen?.map((file) => file.filename) || [];

            if (nuevasImagenes.length > 0) {
                // 1) Borrar de disco TODAS las imágenes anteriores
                if (product.imagen && Array.isArray(product.imagen)) {
                    product.imagen.forEach((img) => deleteImageFromDisk(img));
                }

                // 2) Reemplazar el array de imagen por solo las nuevas
                data.imagen = nuevasImagenes;
            }

            const updatedProduct = await ProductService.updateProduct(pid, data);

            return res.status(200).json({
                message: "Producto actualizado",
                product: updatedProduct
            });

        } catch (error) {
            return res.status(500).json({
                message: "Error al actualizar",
                error: error.message
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
                    message: "Producto no encontrado"
                });
            }

            // Borrar todas las imágenes del array (usamos la función auxiliar, no `this`)
            if (product.imagen && Array.isArray(product.imagen)) {
                product.imagen.forEach((img) => deleteImageFromDisk(img));
            }

            await ProductService.deleteProduct(pid);

            return res.status(200).json({
                message: "Producto eliminado"
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({
                message: "Error al eliminar producto",
                error: error.message
            });
        }
    }

    async getProducts(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = Math.min(parseInt(req.query.limit) || 10, 1000); // limite máximo razonable
            const q = req.query.q?.trim() || '';

            if (page < 1 || limit < 1) {
                return res.status(400).json({ message: "Los parámetros 'page' y 'limit' deben ser números positivos" });
            }

            // Pasamos q al service
            const result = await ProductService.getProducts(page, limit, q);
            return res.status(200).json(result);
        } catch (error) {
            return res.status(500).json({ message: "Error al obtener los productos", error: error.message });
        }
    }

    async getProductBySku(req, res) {
        const sku = (req.params.sku || '').trim();
        if (!sku) return res.status(400).json({ message: 'SKU requerido' });

        try {
            const product = await ProductService.getProductBySku(sku);
            if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
            return res.status(200).json(product);
        } catch (err) {
            return res.status(500).json({ message: 'Error al obtener producto por SKU', error: err.message });
        }
    }
    async getProductById(req, res) {

        const pid = req.params.pid;
        if (!mongoose.Types.ObjectId.isValid(pid)) {
            return res.status(400).json({ message: 'ID inválido' });
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
                error: error.message
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
                    message: 'No se encontró ningún producto con esa marca'
                })
            }
            return res.status(200).json(result);
        } catch (error) {
            return res.status(500).json({
                message: "Error al obtener productos por marca",
                error: error.message
            })
        }

    }
    async getProductByCategory(req, res) {
        const category = req.params.category;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        if (!category) {
            return res.status(400).json({ message: "Categoría requerida" });
        }

        // Validar que page y limit sean números positivos
        if (page < 1 || limit < 1) {
            return res.status(400).json({
                message: "Los parámetros 'page' y 'limit' deben ser números positivos"
            });
        }

        try {
            const result = await ProductService.getProductByCategory(category, page, limit);
            if (!result.products.length) {
                return res.status(404).json({
                    message: 'No se encontró ningún producto con esa categoría'
                });
            }
            return res.status(200).json(result);
        } catch (error) {
            return res.status(500).json({
                message: "Error al obtener productos por categoría",
                error: error.message
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
                message: "Los parámetros 'page' y 'limit' deben ser números positivos"
            });
        }

        try {
            const result = await ProductService.getProductBySubCategory(subcategory, page, limit);
            if (!result.products.length) {
                return res.status(404).json({
                    message: 'No se encontró ningún producto con esa subcategoría'
                });
            }
            return res.status(200).json(result);
        } catch (error) {
            return res.status(500).json({
                message: "Error al obtener productos por subcategoría",
                error: error.message
            });
        }
    }
    async getSubCategories(req, res) {
        try {
            // Si tenés ProductService, delegar acá:
            const subcategorias = await ProductService.getSubCategories();
            return res.status(200).json(subcategorias.sort());
        } catch (error) {
            console.error('Error al obtener subcategorías:', error);
            return res.status(500).json({
                message: 'Error al obtener subcategorías',
                error: error.message
            });
        }
    }

}

export default new ProductController();