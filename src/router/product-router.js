import ProductController from "../controllers/product-controller.js";
import express from "express";
import upload from "../config/multerConfig.js";

const router = express.Router();

// Subcategorías por categoría
router.get("/categorias", ProductController.getCategories);
router.get(
  "/subcategorias/:category",
  ProductController.getSubcategoriesByCategory,
);

// Buscar por SKU
router.get("/sku/:sku", ProductController.getProductBySku);

// Productos en oferta vigente
router.get("/ofertas", ProductController.getSales);

// Limpiar ofertas vencidas (admin)
router.post("/ofertas/limpiar", ProductController.limpiarOfertasVencidas);

// Crear producto
router.post("/", upload.array("imagen", 10), ProductController.createProduct);

// Obtener productos (con todos los filtros + ?soloOfertas=true)
router.get("/", ProductController.getProducts);

// ─────────────────────────────────────────
// Rutas dinámicas con :pid
// ─────────────────────────────────────────

// Obtener producto por ID
router.get("/:pid", ProductController.getProductById);

// Actualizar producto
router.put(
  "/:pid",
  upload.array("imagen", 10),
  ProductController.updateProduct,
);

// Eliminar producto
router.delete("/:pid", ProductController.deleteProduct);

// Activar oferta de un producto
router.patch("/:pid/oferta/activar", ProductController.activarOferta);

// Desactivar oferta de un producto
router.patch("/:pid/oferta/desactivar", ProductController.desactivarOferta);

export default router;
