import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, "../.env") });

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";

import userRouter from "./router/user-router.js";
import cartRouter from "./router/cart-router.js";
import productRouter from "./router/product-router.js";
import orderRouter from "./router/order-router.js";
import mercadoPagoRouter from "./router/mp-test-router.js";

const app = express();
const PORT = process.env.PORT || 8080;
const allowedOrigins = [
    "http://localhost:5173",
    "https://onemorepointsfront-production.up.railway.app",
];

//Conexión DB
mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log("Conectado con MongoDB"))
    .catch(() => console.log("Error al conectar con MongoDB"))

//MiddleWare
app.use(express.urlencoded({ extended: true }))
app.use(express.json());
app.use(
    cors({
        origin: (origin, callback) => {
            // Permitir requests sin origin (por ejemplo, Postman)
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            } else {
                return callback(new Error("CORS no permitido por este dominio"));
            }
        },
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization"],
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    })
);
app.use('/uploads', express.static('uploads'));
app.use(express.static("./src/public"));




//rutas 
app.get('/', (req,res) => res.send("Estamos On"));
app.use('/api/user', userRouter);
app.use('/api/cart', cartRouter);
app.use('/api/products', productRouter);
app.use('/api/orders', orderRouter);
app.use('/api/mp', mercadoPagoRouter);
app.listen(PORT, () => console.log(`Escuchando en el puerto : ${PORT}`));