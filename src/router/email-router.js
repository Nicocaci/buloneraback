import { Router } from "express";
import { sendEmail } from "../controllers/email.controller.js";
import upload from "../config/multerConfig.js"; // ajustá la ruta según donde lo tengas

const router = Router();

router.post("/send", upload.array("archivos", 5), sendEmail);

export default router;