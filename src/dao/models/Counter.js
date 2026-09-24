import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // ej: "orderNumber"
  seq: { type: Number, default: 0 },
});

const counterModel = mongoose.model("counters", counterSchema);

export default counterModel;