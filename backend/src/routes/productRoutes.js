import express from "express";
import { Product } from "../models/Product.js";
import { authRequired, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  const products = await Product.find().sort({ createdAt: -1 });
  return res.json(products);
});

router.post("/", authRequired, requireRole("admin"), async (req, res) => {
  try {
    const { name, category, unit, price, stock, image } = req.body;
    if (!name || !category || !unit || !image || price == null || stock == null) {
      return res.status(400).json({ message: "name, category, unit, price, stock and image are required." });
    }
    const created = await Product.create({
      name: name.trim(),
      category: category.trim(),
      unit: unit.trim(),
      price: Number(price),
      stock: Number(stock),
      image: image.trim()
    });
    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ message: "Could not create product.", error: error.message });
  }
});

router.put("/:id", authRequired, requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;
    const updated = await Product.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: "Product not found." });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ message: "Could not update product.", error: error.message });
  }
});

router.delete("/:id", authRequired, requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Product not found." });
    return res.json({ message: "Product deleted." });
  } catch (error) {
    return res.status(500).json({ message: "Could not delete product.", error: error.message });
  }
});

export default router;
