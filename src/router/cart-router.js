import CartController from "../controllers/cart-controller.js";
import express from "express";
import authMiddleware from "../middlewares/auth-middleware.js";

const router = express.Router();

router.use(authMiddleware());

router.get("/me", CartController.getMyCart);
router.post("/me/products/:pid", CartController.addProduct);
router.put("/me/products/:pid", CartController.updateProduct);
router.delete("/me/products/:pid", CartController.removeProduct);
router.delete("/me", CartController.clearMyCart);

export default router;