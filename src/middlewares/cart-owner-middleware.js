import CartModel from "../dao/models/cart-model.js";

const cartOwnerMiddleware = async (req, res, next) => {
    try {
        const { cid } = req.params;

        // Aceptar tanto _id como id del payload
        const userId = req.user?._id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Usuario no autenticado" });
        }

        const cart = await CartModel.findById(cid).populate("user");
        if (!cart) {
            return res.status(404).json({ message: "Carrito no encontrado" });
        }

        // Si está populado, usar cart.user._id, si no, usar cart.user directamente
        const cartUserId = (cart.user && cart.user._id) ? cart.user._id : cart.user;

        // Comparar ObjectIds como strings
        if (cartUserId.toString() !== userId.toString()) {
            return res.status(403).json({ message: "No tienes permiso para ver este carrito" });
        }

        req.cart = cart;
        next();
    } catch (error) {
        return res.status(500).json({
            message: "Error verificando el dueño del carrito",
            error: error.message,
        });
    }
};

export default cartOwnerMiddleware;