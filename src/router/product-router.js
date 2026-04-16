import ProductController from "../controllers/product-controller.js";
import express from "express";
import upload from "../config/multerConfig.js";

const router = express.Router();

// Crear producto
router.post('/',upload.array('imagen', 10),ProductController.createProduct);

// Obtener productos (CON TODOS LOS FILTROS)
router.get('/', ProductController.getProducts);

// Subcategorías (esto sí tiene sentido mantenerlo)
router.get('/subcategorias', ProductController.getSubCategories);

// Buscar por SKU
router.get('/sku/:sku', ProductController.getProductBySku);

// Obtener productos en oferta
router.get('/ofertas', ProductController.getSales);

// Obtener producto por ID
router.get('/:pid', ProductController.getProductById);



// Actualizar producto
router.put('/:pid',upload.array('imagen', 10),ProductController.updateProduct);

// Eliminar producto
router.delete('/:pid', ProductController.deleteProduct);

export default router;