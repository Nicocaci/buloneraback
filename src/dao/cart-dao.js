import CartModel from "./models/cart-model.js";
import ProductModel from "./models/product-model.js";

class CartDAO {
  async createCart(cart) {
    try {
      const newCart = await CartModel.create(cart);
      return newCart;
    } catch (error) {
      throw error;
    }
  }
  async getCarts() {
    try {
      const carts = await CartModel.find().populate("user");
      return carts;
    } catch (error) {
      throw error;
    }
  }
  async getCartById(id) {
    try {
      const cart = await CartModel.findById(id).populate("products.product");
      if (!cart) {
        throw new Error("Carrito no encontrado");
      }
      return cart;
    } catch (error) {
      throw error;
    }
  }
  async updateCart(id, cart) {
    try {
      const updatedCart = await CartModel.findByIdAndUpdate(id, cart, {
        new: true,
      });
      if (!updatedCart) {
        throw new Error("Carrito no encontrado");
      }
      return updatedCart;
    } catch (error) {
      throw error;
    }
  }
  async deleteCart(id) {
    try {
      const deletedCart = await CartModel.findByIdAndDelete(id);
      if (!deletedCart) {
        throw new Error("Carrito no encontrado");
      }
      return deletedCart;
    } catch (error) {
      throw error;
    }
  }

  async addProductToCart(id, product, quantity) {
    try {
      const cart = await CartModel.findById(id).populate("products.product");
      if (!cart) {
        throw new Error("Carrito no encontrado");
      }

      const productDoc = await ProductModel.findById(product);
      if (!productDoc) {
        throw new Error("Producto no encontrado");
      }

      const existingProduct = cart.products.find(
        (p) => p.product?._id?.toString() === product.toString(),
      );

      const cantidadFinal = (existingProduct?.quantity || 0) + quantity;
      if (cantidadFinal > productDoc.stock) {
        throw new Error(
          `No hay suficiente stock para el producto ${productDoc.item}. Stock disponible: ${productDoc.stock}`,
        );
      }

      if (existingProduct) {
        existingProduct.quantity = cantidadFinal;
      } else {
        cart.products.push({ product, quantity });
      }
      await cart.save();
      return cart;
    } catch (error) {
      throw error;
    }
  }
  async removeProductFromCart(id, product) {
    try {
      const cart = await CartModel.findById(id).populate("products.product");
      if (!cart) {
        throw new Error("Carrito no encontrado");
      }
      cart.products = cart.products.filter(
        (p) => p.product._id.toString() !== product.toString(),
      );
      await cart.save();
      return cart;
    } catch (error) {
      throw error;
    }
  }
async updateProductQuantity(id, product, quantity) {
  try {
    const cart = await CartModel.findById(id).populate("products.product");
    if (!cart) {
      throw new Error("Carrito no encontrado");
    }

    const existingProduct = cart.products.find(
      (p) => p.product._id.toString() === product.toString(),
    );

    if (!existingProduct) {
      throw new Error("Producto no encontrado en el carrito");
    }

    const productDoc = await ProductModel.findById(product);
    if (!productDoc) {
      throw new Error("Producto no encontrado");
    }

    if (quantity > productDoc.stock) {
      throw new Error(`Solo hay ${productDoc.stock} unidades disponibles`);
    }

    existingProduct.quantity = quantity;
    await cart.save();
    return cart;
  } catch (error) {
    throw error;
  }
}

  async clearCart(id) {
    try {
      const cart = await CartModel.findById(id).populate("products.product");
      if (!cart) {
        throw new Error("Carrito no encontrado");
      }
      cart.products = [];
      await cart.save();
      return cart;
    } catch (error) {
      throw error;
    }
  }
    async getCartByUserId(userId) {
    return await CartModel.findOne({ user: userId }).populate(
      "products.product",
    );
  }
    async createCartForUser(userId) {
    return await CartModel.create({
      user: userId,
      products: [],
    });
  }

  async saveCart(cart) {
    await cart.save();
    await cart.populate("products.product");
    return cart;
  }
}
export default new CartDAO();
