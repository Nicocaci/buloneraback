import UserService from "../service/user-service.js";
import bcrypt from "bcrypt";
import generateToken from "../utils/jsonwebtoken.js";
import CartService from "../service/cart-service.js";

class UserController {
  async register(req, res) {
    const { nombre, apellido, dni, direccion, email, password, cart, role } =
      req.body;
    try {
      const existingUser = await UserService.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "El email ya está registrado" });
      }
      if (!nombre || !apellido || !dni || !direccion || !email || !password) {
        return res.status(400).json({
          message: "Faltan Campos requeridos",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await UserService.createUser({
        nombre,
        apellido,
        dni,
        direccion,
        email,
        password: hashedPassword,
        role,
      });

      const newCart = await CartService.createCart({ user: newUser._id });

      // Actualizar el usuario con el ID del carrito
      const updatedUser = await UserService.updateUser(newUser._id, {
        cart: newCart._id,
      });

      return res
        .status(201)
        .json({ message: "Usuario creado correctamente", user: updatedUser });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Error al crear el usuario", error: error.message });
    }
  }
  async login(req, res) {
    const { email, password } = req.body;
    try {
      const user = await UserService.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "Usuario no encontrado" });
      }
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Contraseña incorrecta" });
      }
      const token = generateToken({
        id: user._id,
        email: user.email,
        role: user.role,
      });

      res.cookie("access_token", token, {
        httpOnly: false,
        secure: true,
        sameSite: "none",
        maxAge: 24 * 60 * 60 * 1000,
        path: "/",
        domain: ".railway.app",
      });
      return res.status(201).json({
        message: "Login con exito",
        token,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Error al iniciar sesión", error: error.message });
    }
  }
  async cerrarSesion(req, res) {
    res.clearCookie("access_token", {
      httpOnly: false,
      secure: true,
      sameSite: "none",
      path: "/",
      domain: "railway.app",
    });
    res.status(200).json({ message: "Logout Exitoso" });
  }
  async borrarUsuario(req, res) {
    const uId = req.params.uId;
    try {
      const user = await UserService.deleteUser(uId);
      if (!user) {
        return res.status(404).json({ message: "No se encontro usuario" });
      }
      return res.status(204).json({ message: "Usuario eliminado con exito" });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error para eliminar usuario " + error.message });
    }
  }
  async actualizarUsuario(req, res) {
    const userId = req.params.id.trim();
    const userData = req.body;
    try {
      const usuarioActualizado = await UserService.updateUser(userId, userData);

      return res.status(200).json({
        message: "Usuario actualizado con éxito",
        user: usuarioActualizado,
      });
    } catch (error) {
      console.error("❌ Error al actualizar usuario:", error);
      return res
        .status(500)
        .json({ message: "Error al actualizar usuario: " + error.message });
    }
  }
  async obtenerUsuarios(req, res) {
    try {
      const usuarios = await UserService.getUsers();
      res.status(200).json(usuarios);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error al traer usuarios: " + error.message });
    }
  }
  async obtenerUsuarioId(req, res) {
    const { uid } = req.params;

    console.log("ID params:", uid);
    console.log("ID token:", req.user.id);
    console.log("ROLE token:", req.user.role);

    try {
      // 🔐 Seguridad
      if (req.user.role !== "admin" && req.user.id !== uid) {
        return res.status(403).json({ message: "No autorizado" });
      }

      const user = await UserService.getUserById(uid);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      res.status(200).json(user);
    } catch (error) {
      console.error("Error al obtener usuario:", error.message);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  }
  async getUserByEmail(req, res) {
    const { email } = req.params.email;
    try {
      const user = await UserService.getUserByEmail(email);
      if (!email) {
        return res.status(400).json({
          message: "Email no encontrado",
        });
      }
      return res.status(200).json(user);
    } catch (error) {
      console.error("Error al obtener usuario:", error.message);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  }

  async getMe(req, res) {
    try {
      const user = await UserService.getUserById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ message: "Error interno del servidor" });
    }
  }
}
export default new UserController();
