import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";

import userRouter from "./router/user-router.js";
import cartRouter from "./router/cart-router.js";
import productRouter from "./router/product-router.js";
import orderRouter from "./router/order-router.js";
import mercadoPagoRouter from "./router/mp-router.js";
import sendEmailRouter from "./router/email-router.js";
import shippingRouter from "./router/shipping.router.js";              // 👈 nuevo
import shippingWebhookRouter from "./router/shipping-webhook-router.js"; // 👈 nuevo

import dotenv from "dotenv";
dotenv.config();

import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

const allowedOrigins = [
  "http://localhost:5173",
  "https://www.buloneraeltriangulo.com",
  "https://buloneraeltriangulo.com",
];

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("Conectado con MongoDB"))
  .catch(() => console.log("Error al conectar con MongoDB"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: (origin, callback) => {
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
app.use("/api/shipping", shippingRouter);          // 👈 nuevo
app.use("/webhooks", shippingWebhookRouter);       // 👈 nuevo, fuera de /api

app.listen(PORT, () =>
  console.log(`Escuchando en el puerto: ${PORT}`)
);