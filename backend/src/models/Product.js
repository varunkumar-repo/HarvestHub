import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 1 },
    unit: { type: String, required: true, trim: true, default: "unit" },
    stock: { type: Number, required: true, min: 0 },
    image: { type: String, required: true }
  },
  { timestamps: true }
);

export const Product = mongoose.model("Product", productSchema);
