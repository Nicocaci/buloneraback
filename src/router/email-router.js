import { Router } from "express";
import { sendEmail } from "../controllers/email.controller.js";
import { uploadContactFiles } from "../config/multerConfig.js";
import { contactLimiter } from "../middlewares/rate-limit.js";

const router = Router();

// El límite va antes de multer: se corta el abuso sin recibir los archivos.
router.post("/send", contactLimiter, uploadContactFiles.array("archivos", 5), sendEmail);

export default router;
