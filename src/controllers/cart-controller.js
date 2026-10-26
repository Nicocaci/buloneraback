import CartService from "../service/cart-service.js";
import ProductModel from "../dao/models/product-model.js";
import { isValidObjectId } from "../utils/validators.js";

// ID del producto de un ítem del carrito, esté populado o no.
// Si el producto se borró, populate deja null: devuelve "" en vez de romper.
const idDeProducto = (item) => String(item.product?._id ?? item.product ?? "");

const mapCartErrorToResponse = (res, error) => {
  if (error?.message === "Carrito no encontrado") {
    return res.status(404).json({ message: "Carrito no encontrado" });
  }
  if (error?.message === "Producto no encontrado en el carrito") {
    return res
      .status(404)
      .json({ message: "Producto no encontrado en el carrito" });
  }
  if (error?.message === "Producto no encontrado") {
    return res.status(404).json({ message: "Producto no encontrado" });
  }
  if (error?.message?.startsWith("Solo hay")) {
    return res.status(400).json({ message: error.message });
  }
  // Error inesperado: se loguea acá y nunca se devuelve el detalle interno
  console.error("Error en el carrito:", error);
  return res.status(500).json({ message: "Error interno del servidor" });
};

class CartController {
  async getMyCart(req, res) {
    try {
      const userId = req.user.id;

      let cart = await CartService.getCartByUserId(userId);

      if (!cart) {
        cart = await CartService.createCartForUser(userId);
      }

      res.status(200).json(cart);
    } catch (error) {
      mapCartErrorToResponse(res, error);
    }
  }
  async addProduct(req, res) {
    try {
      const userId = req.user.id;
      const { pid } = req.params;
      const quantity = Number(req.body.quantity) || 1;
      if (!isValidObjectId(pid)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const product = await ProductModel.findById(pid);
      if (!product) {
        return res.status(404).json({ message: "Producto no encontrado" });
      }

      let cart = await CartService.getCartByUserId(userId);
      if (!cart) {
        cart = await CartService.createCartForUser(userId);
      }

      const existingProduct = cart.products.find((p) => idDeProducto(p) === pid);

      const cantidadFinal = (existingProduct?.quantity || 0) + quantity;

      if (cantidadFinal > product.stock) {
        return res.status(400).json({
          message: `Solo hay ${product.stock} unidades disponibles`,
        });
      }

      if (existingProduct) {
        existingProduct.quantity = cantidadFinal;
      } else {
        cart.products.push({ product: pid, quantity });
      }

      const updatedCart = await CartService.saveCart(cart);
      res.status(200).json(updatedCart);
    } catch (error) {
      mapCartErrorToResponse(res, error);
    }
  }
  async updateProduct(req, res) {
    try {
      const userId = req.user.id;
      const { pid } = req.params;
      const { quantity } = req.body;
      if (!isValidObjectId(pid)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      if (!quantity || quantity < 1) {
        return res.status(400).json({ message: "Cantidad inválida" });
      }
      const product = await ProductModel.findById(pid);
      if (!product) {
        return res.status(404).json({ message: "Producto no encontrado" });
      }
      if (quantity > product.stock) {
        return res
          .status(400)
          .json({ message: `Solo hay ${product.stock} unidades disponibles` });
      }
      const cart = await CartService.getCartByUserId(userId);
      if (!cart) {
        return res.status(404).json({ message: "Carrito no encontrado" });
      }
      const productIndex = cart.products.findIndex((p) => idDeProducto(p) === pid);
      if (productIndex === -1) {
        return res.status(404).json({
          message: "Producto no encontrado en el carrito",
        });
      }
      cart.products[productIndex].quantity = quantity;

      const updatedCart = await CartService.saveCart(cart);
      return res.status(200).json(updatedCart);
    } catch (error) {
      mapCartErrorToResponse(res, error);
    }
  }
  async removeProduct(req, res) {
    try {
      const userId = req.user.id;
      const { pid } = req.params;

      const cart = await CartService.getCartByUserId(userId);
      if (!cart) throw new Error("Carrito no encontrado");

      cart.products = cart.products.filter((p) => idDeProducto(p) !== pid);

      const updatedCart = await CartService.saveCart(cart);

      res.status(200).json(updatedCart);
    } catch (error) {
      mapCartErrorToResponse(res, error);
    }
  }
  async clearMyCart(req, res) {
    try {
      const userId = req.user.id;

      const cart = await CartService.getCartByUserId(userId);
      if (!cart) throw new Error("Carrito no encontrado");

      cart.products = [];

      const updatedCart = await CartService.saveCart(cart);

      res.status(200).json(updatedCart);
    } catch (error) {
      mapCartErrorToResponse(res, error);
    }
  }
}

export default new CartController();
