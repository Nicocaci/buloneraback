import UserService from "../service/user-service.js";
import bcrypt from "bcrypt";
import generateToken from "../utils/jsonwebtoken.js";
import CartService from "../service/cart-service.js";
import {
  clean,
  isNonEmpty,
  isValidEmail,
  isValidObjectId,
} from "../utils/validators.js";

const MIN_PASSWORD = 8;
const MAX_PASSWORD = 128;

// Campos que un usuario puede editar de su perfil. Nunca role, password ni cart.
const CAMPOS_EDITABLES = ["nombre", "apellido", "dni", "direccion", "email"];

const LIMITES = { nombre: 80, apellido: 80, dni: 20, direccion: 200, email: 254 };

const normalizarDni = (dni) => clean(dni).replace(/[.\-\s]/g, "");
const dniValido = (dni) => /^\d{6,11}$/.test(dni);

class UserController {
  async register(req, res, next) {
    try {
      const nombre = clean(req.body.nombre);
      const apellido = clean(req.body.apellido);
      const dni = normalizarDni(req.body.dni);
      const direccion = clean(req.body.direccion);
      const email = clean(req.body.email).toLowerCase();
      const password = typeof req.body.password === "string" ? req.body.password : "";

      if (
        !isNonEmpty(nombre, LIMITES.nombre) ||
        !isNonEmpty(apellido, LIMITES.apellido) ||
        !isNonEmpty(direccion, LIMITES.direccion) ||
        !dni ||
        !email ||
        !password
      ) {
        return res.status(400).json({ message: "Completá todos los campos obligatorios." });
      }
      if (!isValidEmail(email)) {
        return res.status(400).json({ message: "El email no es válido." });
      }
      if (!dniValido(dni)) {
        return res.status(400).json({ message: "El DNI no es válido." });
      }
      if (password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) {
        return res.status(400).json({
          message: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`,
        });
      }

      const existingUser = await UserService.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "El email ya está registrado" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      let newUser;
      try {
        newUser = await UserService.createUser({
          nombre,
          apellido,
          dni,
          direccion,
          email,
          password: hashedPassword,
          role: "user", // el rol nunca se toma del body
        });
      } catch (error) {
        if (error?.code === 11000 && error?.keyPattern?.dni) {
          return res.status(409).json({ message: "Ya existe una cuenta con ese DNI." });
        }
        throw error;
      }

      const newCart = await CartService.createCart({ user: newUser._id });

      const updatedUser = await UserService.updateUser(newUser._id, {
        cart: newCart._id,
      });

      const token = generateToken({
        id: updatedUser._id,
        role: updatedUser.role,
        cart: updatedUser.cart,
      });

      return res.status(201).json({
        message: "Usuario creado correctamente",
        token,
        user: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const email = clean(req.body.email).toLowerCase();
      const password = typeof req.body.password === "string" ? req.body.password : "";

      if (!email || !password) {
        return res.status(400).json({ message: "Ingresá tu email y contraseña." });
      }

      const user = await UserService.getUserByEmail(email);
      const isPasswordValid = user
        ? await bcrypt.compare(password, user.password)
        : false;

      // Mismo mensaje para email inexistente y contraseña incorrecta: no revela qué emails están registrados.
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Email o contraseña incorrectos" });
      }

      const token = generateToken({
        id: user._id,
        email: user.email,
        role: user.role,
      });

      res.cookie("access_token", token, {
        httpOnly: true,
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
      next(error);
    }
  }

  async cerrarSesion(req, res) {
    res.clearCookie("access_token", {
        httpOnly: false,
        secure: false,
        sameSite: "none",
        path: "/",
        domain: "railway.app",
    });
    res.status(200).json({ message: "Logout Exitoso" });
  }

  async borrarUsuario(req, res, next) {
    try {
      const uId = req.params.uId;

      if (!isValidObjectId(uId)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      if (uId === String(req.user.id)) {
        return res.status(400).json({ message: "No podés eliminar tu propia cuenta." });
      }

      const user = await UserService.getUserById(uId);
      if (!user) {
        return res.status(404).json({ message: "No se encontro usuario" });
      }

      await CartService.deleteCartByUserId(uId);
      await UserService.deleteUser(uId);

      return res.status(200).json({
        message: "Usuario y carrito eliminados con exito",
      });
    } catch (error) {
      next(error);
    }
  }

  async actualizarUsuario(req, res, next) {
    try {
      const userId = clean(req.params.id);
      if (!isValidObjectId(userId)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const update = {};
      for (const campo of CAMPOS_EDITABLES) {
        if (req.body[campo] === undefined) continue;

        let valor = campo === "dni" ? normalizarDni(req.body[campo]) : clean(req.body[campo]);
        if (campo === "email") valor = valor.toLowerCase();

        if (!isNonEmpty(valor, LIMITES[campo])) {
          return res.status(400).json({ message: `El campo ${campo} no es válido.` });
        }
        update[campo] = valor;
      }

      if (Object.keys(update).length === 0) {
        return res.status(400).json({ message: "No hay datos para actualizar." });
      }
      if (update.email && !isValidEmail(update.email)) {
        return res.status(400).json({ message: "El email no es válido." });
      }
      if (update.dni && !dniValido(update.dni)) {
        return res.status(400).json({ message: "El DNI no es válido." });
      }

      if (update.email) {
        const existing = await UserService.getUserByEmail(update.email);
        if (existing && String(existing._id) !== userId) {
          return res.status(409).json({ message: "Ese email ya está en uso." });
        }
      }

      let usuarioActualizado;
      try {
        usuarioActualizado = await UserService.updateUser(userId, update);
      } catch (error) {
        if (error?.code === 11000) {
          return res.status(409).json({ message: "El email o el DNI ya están en uso." });
        }
        throw error;
      }

      if (!usuarioActualizado) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      return res.status(200).json({
        message: "Usuario actualizado con éxito",
        user: usuarioActualizado,
      });
    } catch (error) {
      next(error);
    }
  }

  async obtenerUsuarios(req, res, next) {
    try {
      const usuarios = await UserService.getUsers();
      res.status(200).json(usuarios);
    } catch (error) {
      next(error);
    }
  }

  async obtenerUsuarioId(req, res, next) {
    try {
      const { id } = req.params;
      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const user = await UserService.getUserById(id);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }

  async getMe(req, res, next) {
    try {
      const user = await UserService.getUserById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }
}
export default new UserController();
