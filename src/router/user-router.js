import UserController from "../controllers/user-controller.js";
import express from "express";
import auth from "../middlewares/auth-middleware.js";

const router = express.Router();

router.get('/', auth(["admin"]),UserController.obtenerUsuarios);
router.post('/registro', UserController.register);
router.post('/iniciarSesion', UserController.login);
router.post('/cerrarSesion', UserController.cerrarSesion);
router.delete('/:uId', UserController.borrarUsuario);
router.put('/:id', UserController.actualizarUsuario);
router.get('/:id', UserController.obtenerUsuarioId);
export default router;