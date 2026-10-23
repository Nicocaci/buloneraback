import UserController from "../controllers/user-controller.js";
import express from "express";
import auth, { ownerOrAdmin } from "../middlewares/auth-middleware.js";
import { loginLimiter, registerLimiter } from "../middlewares/rate-limit.js";

const router = express.Router();

// 🔥 PRIMERO las rutas específicas
router.post("/registro", registerLimiter, UserController.register);
router.post("/iniciarSesion", loginLimiter, UserController.login);
router.post("/cerrarSesion", UserController.cerrarSesion);

router.get("/me", auth(), UserController.getMe);

// 👑 ADMIN
router.get("/", auth(["admin"]), UserController.obtenerUsuarios);
router.delete("/:uId", auth(["admin"]), UserController.borrarUsuario);

// 👤 AL FINAL las dinámicas: solo el propio usuario o un admin
router.get("/:id", auth(), ownerOrAdmin("id"), UserController.obtenerUsuarioId);
router.put("/:id", auth(), ownerOrAdmin("id"), UserController.actualizarUsuario);

export default router;
