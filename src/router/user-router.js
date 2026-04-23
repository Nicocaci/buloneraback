import UserController from "../controllers/user-controller.js";
import express from "express";
import auth from "../middlewares/auth-middleware.js";

const router = express.Router();
// 🔥 PRIMERO las rutas específicas
router.post('/registro', UserController.register);
router.post('/iniciarSesion', UserController.login);
router.post('/cerrarSesion', UserController.cerrarSesion);

router.get("/me", auth(), UserController.getMe);

// 👑 ADMIN
router.get('/', auth(["admin"]), UserController.obtenerUsuarios);
router.delete('/:uId', auth(["admin"]), UserController.borrarUsuario);

// 👤 AL FINAL las dinámicas
router.get('/:id', UserController.obtenerUsuarioId);
router.put('/:id', UserController.actualizarUsuario);

export default router;