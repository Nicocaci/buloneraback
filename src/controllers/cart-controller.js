import CartService from "../service/cart-service.js";

const mapCartErrorToResponse = (res, error) => {
  if (error?.message === "Carrito no encontrado") {
    return res.status(404).json({ message: "Carrito no encontrado" });
  }
  if (error?.message === "Producto no encontrado en el carrito") {
    return res
      .status(404)
      .json({ message: "Producto no encontrado en el carrito" });
  }
  return res
    .status(500)
    .json({ message: "Error interno del servidor", error: error.message });
};

class CartController {
  async createCart(req, res) {
    try {
      const newCart = await CartService.createCart();
      res.status(201).json(newCart);
    } catch (error) {
      mapCartErrorToResponse(res, error);
    }
  }
  async getCart(req, res) {
    try {
      const cart = await CartService.getCarts();
      res.status(200).json(cart);
    } catch (error) {
      mapCartErrorToResponse(res, error);
    }
  }
  async getCartById(req, res) {
    const cid = req.params.cid;
    try {
      const cart = await CartService.getCartById(cid);
      if (!cart) {
        return res
          .status(404)
          .json({ message: "No se encontró ningun carrito" });
      }
      res.status(200).json(cart);
    } catch (error) {
      mapCartErrorToResponse(res, error);
    }
  }
  async addProductToCart(req, res) {
    const cid = req.params.cid;
    const pid = req.params.pid;
    const quantity = req.body.quantity || 1;
    if (!cid || !pid) {
      return res.status(400).json({
        message: "Se requiere el identificador del carrito y del producto",
      });
    }
    if (Number.isNaN(Number(quantity)) || Number(quantity) <= 0) {
      return res
        .status(400)
        .json({ message: "La cantidad debe ser un número mayor que cero" });
    }
    try {
      const addProduct = await CartService.addProductToCart(cid, pid, quantity);
      res.status(200).json(addProduct);
    } catch (error) {
      mapCartErrorToResponse(res, error);
    }
  }
  async removeProductFromCart(req, res) {
    const cid = req.params.cid;
    const pid = req.params.pid;
    if (!cid || !pid) {
      return res.status(400).json({
        message: "Se requiere el identificador del carrito y del producto",
      });
    }
    try {
      const removeProduct = await CartService.removeProductFromCart(cid, pid);
      res.status(200).json(removeProduct);
    } catch (error) {
      mapCartErrorToResponse(res, error);
    }
  }
  async updateProductQuantity(req, res) {
    const cid = req.params.cid;
    const pid = req.params.pid;
    const quantity = req.body.quantity || 1;
    if (!cid || !pid) {
      return res.status(400).json({
        message: "Se requiere el identificador del carrito y del producto",
      });
    }
    if (Number.isNaN(Number(quantity)) || Number(quantity) <= 0) {
      return res
        .status(400)
        .json({ message: "La cantidad debe ser un número mayor que cero" });
    }
    try {
      const updateProduct = await CartService.updateProductQuantity(
        cid,
        pid,
        quantity,
      );
      res.status(200).json(updateProduct);
    } catch (error) {
      mapCartErrorToResponse(res, error);
    }
  }
  async updateCart(req, res) {
    const cid = req.params.cid;
    const data = req.body;
    try {
      const cart = await CartService.updateCart(cid, data);
      if (!cart) {
        return res.status(404).json({
          message: "Carrito no encontrado",
        });
      }
      res.status(200).json(cart);
    } catch (error) {
      mapCartErrorToResponse(res, error);
    }
  }
  async deleteCart(req, res) {
    const cid = req.params.cid;
    if (!cid) {
      return res
        .status(400)
        .json({ message: "Se requiere el identificador del carrito" });
    }
    try {
      const cart = await CartService.deleteCart(cid);
      res.status(200).json(cart);
    } catch (error) {
      mapCartErrorToResponse(res, error);
    }
  }
  async clearCart(req, res) {
    const cid = req.params.cid;
    if (!cid) {
      return res
        .status(400)
        .json({ message: "Se requiere el identificador del carrito" });
    }
    try {
      const updatedCart = await CartService.clearCart(cid);
      res.status(200).json(updatedCart);
    } catch (error) {
      mapCartErrorToResponse(res, error);
    }
  }
  async getMyCart(req, res) {
    try {
      const userId = req.user.id;

      let cart = await CartService.getCartByUserId(userId);

      if (!cart) {
        cart = await CartService.createCartForUser(userId);
      }

      res.status(200).json(cart);
    } catch (error) {
      console.log(error);
      mapCartErrorToResponse(res, error);
    }
  }
  async addProduct(req, res) {
    try {
      const userId = req.user.id;
      const { pid } = req.params;
      const quantity = Number(req.body.quantity) || 1;

      let cart = await CartService.getCartByUserId(userId);

      if (!cart) {
        cart = await CartService.createCartForUser(userId);
      }

      const existingProduct = cart.products.find(
        (p) => p.product._id.toString() === pid,
      );

      if (existingProduct) {
        existingProduct.quantity += quantity;
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
      if (!quantity || quantity < 1) {
        return res.status(400).json({ message: "Cantidad inválida" });
      }
      const cart = await CartService.getCartByUserId(userId);
      if (!cart) {
        return res.status(404).json({ message: "Carrito no encontrado" });
      }
      // 🔥 Buscar producto (compatible con populate y sin populate)
      const productIndex = cart.products.findIndex((p) => {
        const productId = p.product?._id 
          ? p.product._id.toString() 
          : p.product?.toString();
        // Normalizar ambos a string para comparación
        return productId === pid || productId === String(pid);
      });
      if (productIndex === -1) {
        return res.status(404).json({
          message: "Producto no encontrado en el carrito",
        });
      }
      // 🔥 Actualizar cantidad
      cart.products[productIndex].quantity = quantity;

      const updatedCart = await CartService.saveCart(cart);
      return res.status(200).json(updatedCart);
    } catch (error) {
      console.error("UPDATE PRODUCT ERROR:", error);
      return res.status(500).json({
        message: "Error al actualizar producto",
        error: error.message,
      });
    }
  }
  async removeProduct(req, res) {
    try {
      const userId = req.user.id;
      const { pid } = req.params;

      const cart = await CartService.getCartByUserId(userId);
      if (!cart) throw new Error("Carrito no encontrado");

      cart.products = cart.products.filter(
        (p) => p.product._id.toString() !== pid,
      );

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
  async assignGuestCart(req, res) {
    try {
      const userId = req.user.id;
      const { products } = req.body;

      let cart = await CartService.getCartByUserId(userId);

      if (!cart) {
        cart = await CartService.createCartForUser(userId);
      }

      // 🔥 REEMPLAZA TODO (NO MERGE)
      cart.products = products.map((p) => ({
        product: p._id,
        quantity: p.quantity,
      }));

      const updatedCart = await CartService.saveCart(cart);

      res.status(200).json(updatedCart);
    } catch (error) {
      mapCartErrorToResponse(res, error);
    }
  }
}

export default new CartController();
