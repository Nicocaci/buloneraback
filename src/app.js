// Debe ser el primer import: carga el .env antes de que cualquier módulo lea process.env.
import "dotenv/config";

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import userRouter from "./router/user-router.js";
import cartRouter from "./router/cart-router.js";
import productRouter from "./router/product-router.js";
import orderRouter from "./router/order-router.js";
import mercadoPagoRouter from "./router/mp-router.js";
import sendEmailRouter from "./router/email-router.js";
import shippingRouter from "./router/shipping.router.js";
import shippingWebhookRouter from "./router/shipping-webhook-router.js";
import errorHandler, { notFoundHandler } from "./middlewares/error-handler.js";

const app = express();
const PORT = process.env.PORT || 8080;

// Orígenes permitidos: se pueden definir en CORS_ORIGINS (separados por coma).
// Si no se define, se usan los de siempre.
const DEFAULT_ORIGINS = [
  "http://localhost:5173",
  "https://www.buloneraeltriangulo.com",
  "https://buloneraeltriangulo.com",
];
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
  : DEFAULT_ORIGINS;

// Railway pone un proxy adelante: necesario para que el rate limit vea la IP real del cliente.
app.set("trust proxy", 1);

app.use(
  helmet({
    // Las imágenes de /uploads se muestran desde el dominio del frontend.
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

app.use(
  cors({
    // Origen no permitido: no se agregan headers CORS y el navegador bloquea la respuesta
    // (antes se lanzaba un error que terminaba en un 500).
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  }),
);

app.use(express.json({ limit: "200kb" }));
app.use(express.urlencoded({ extended: true, limit: "200kb" }));
app.use(cookieParser());

app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

app.use("/uploads", express.static("uploads"));
app.use(express.static("./src/public"));

app.get("/", (req, res) => res.send("Estamos On"));

app.use("/api/user", userRouter);
app.use("/api/cart", cartRouter);
app.use("/api/products", productRouter);
app.use("/api/orders", orderRouter);
app.use("/api/mp", mercadoPagoRouter);
app.use("/api/email", sendEmailRouter);
app.use("/api/shipping", shippingRouter);
app.use("/webhooks", shippingWebhookRouter); // fuera de /api

app.use("/api", notFoundHandler);
app.use(errorHandler);

const start = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Conectado con MongoDB");
  } catch (err) {
    // Sin base de datos no tiene sentido levantar la API: se corta el proceso
    // y Railway lo reinicia según su política de reinicio.
    console.error("Error al conectar con MongoDB:", err.message);
    process.exit(1);
  }

  app.listen(PORT, () => console.log(`Escuchando en el puerto: ${PORT}`));
};

start();
