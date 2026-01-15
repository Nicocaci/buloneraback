import CartController from "../controllers/cart-controller.js";
import express from "express";
import cartOwnerMiddleware from "../middlewares/cart-owner-middleware.js";
import authMiddleware from "../middlewares/auth-middleware.js";

const router = express.Router();

router.post('/', CartController.createCart);
router.get('/', CartController.getCart);
router.get('/:cid', authMiddleware(), cartOwnerMiddleware, CartController.getCartById);
router.post('/:cid/products/:pid', CartController.addProductToCart);
router.delete('/:cid/products/:pid', CartController.removeProductFromCart);
router.put('/:cid/products/:pid', CartController.updateProductQuantity);
router.put('/:cid', CartController.updateCart);
router.delete('/:cid', CartController.deleteCart);
router.delete('/:cid/products', CartController.clearCart);

export default router;