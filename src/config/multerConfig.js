import multer from "multer";
import path from "path";
import fs from "fs";

//CARPETA DONDE SE GUARDARAN LAS IMAGENES

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = "uploads/";
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));

    }
});

const upload = multer({ storage });

export default upload;