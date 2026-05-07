import multer from "multer";

const storage = multer.memoryStorage(); // ← sin disco, sin carpeta

const upload = multer({ storage });

export default upload;