// scripts/migration-medidas.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import ProductModel from "../dao/models/product-model.js"; // ajustá el path según tu estructura

dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URL); // o tu variable de entorno real

    const result = await ProductModel.updateMany(
      { peso: { $exists: false } },
      {
        $set: {
          peso: 1,
          alto: 20,
          ancho: 15,
          largo: 10,
        },
      }
    );

    console.log(`Productos actualizados: ${result.modifiedCount}`);
  } catch (err) {
    console.error("Error en la migración:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();