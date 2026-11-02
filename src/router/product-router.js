import ProductController from "../controllers/product-controller.js";
import express from "express";
import authMiddleware from "../middlewares/auth-middleware.js";
import { uploadProductImages } from "../config/multerConfig.js";

const router = express.Router();

// La autenticación va antes de multer: así se rechaza a quien no es admin
// sin recibir ni procesar los archivos.
const adminOnly = authMiddleware(["admin"]);

// ─────────────────────────────────────────
// Públicas
// ─────────────────────────────────────────

// Cantidades para el filtro (categorías, subcategorías, marcas)
router.get("/facetas", ProductController.getFacetas);

// Obtener productos (con todos los filtros + ?soloOfertas=true)
router.get("/", ProductController.getProducts);

// ─────────────────────────────────────────
// Solo admin
// ─────────────────────────────────────────

// Crear producto
router.post(
  "/",
  adminOnly,
  uploadProductImages.array("imagen", 10),
  ProductController.createProduct,
);

// ─────────────────────────────────────────
// Rutas dinámicas con :pid
// ─────────────────────────────────────────

// Obtener producto por ID (pública)
router.get("/:pid", ProductController.getProductById);

// Actualizar producto
router.put(
  "/:pid",
  adminOnly,
  uploadProductImages.array("imagen", 10),
  ProductController.updateProduct,
);

// Eliminar producto
router.delete("/:pid", adminOnly, ProductController.deleteProduct);

export default router;
