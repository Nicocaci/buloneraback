import UserController from "../controllers/user-controller.js";
import express from "express";
import auth from "../middlewares/auth-middleware.js";

const router = express.Router();
// VALIDACION DE USUARIOS
router.post('/registro', UserController.register);
router.post('/iniciarSesion', UserController.login);
router.post('/cerrarSesion', UserController.cerrarSesion);

// 👤 PERFIL PROPIO
router.get("/me", auth(), UserController.getMe);

// 👑 ADMIN
router.get('/', auth(["admin"]),UserController.obtenerUsuarios);
router.delete('/:uId', auth(["admin"]), UserController.borrarUsuario);

// 👤 USER / ADMIN
router.get('/:id', UserController.obtenerUsuarioId);
router.put('/:id', UserController.actualizarUsuario);

export default router;