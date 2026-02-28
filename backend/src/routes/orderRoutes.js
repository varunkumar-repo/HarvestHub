import express from "express";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import mongoose from "mongoose";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

router.get("/", authRequired, async (req, res) => {
  const query = req.user.role === "admin" ? {} : { customerId: req.user.id };
  const orders = await Order.find(query).sort({ createdAt: -1 });
  return res.json(orders);
});

router.post("/", authRequired, async (req, res) => {
  try {
    const { lines = [], deliveryName, deliveryContact, deliveryAddress } = req.body;
    if (!lines.length || !deliveryName || !deliveryContact || !deliveryAddress) {
      return res.status(400).json({ message: "lines and delivery details are required." });
    }

    let total = 0;
    const normalizedLines = [];
    for (const line of lines) {
      const product = await Product.findById(line.productId);
      if (!product) return res.status(400).json({ message: `Product not found: ${line.productId}` });
      if (product.stock < line.qty) {
        return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
      }
      product.stock -= Number(line.qty);
      await product.save();
      total += product.price * Number(line.qty);
      normalizedLines.push({
        productId: product._id,
        name: product.name,
        qty: Number(line.qty),
        price: product.price
      });
    }

    const created = await Order.create({
      customerId: req.user.id,
      total,
      lines: normalizedLines,
      deliveryName: deliveryName.trim(),
      deliveryContact: deliveryContact.trim(),
      deliveryAddress: deliveryAddress.trim(),
      estimatedDelivery: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      status: "placed"
    });

    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ message: "Could not place order.", error: error.message });
  }
});

router.put("/:id/status", authRequired, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    const { status } = req.body;
    const validStatuses = ["placed", "accepted", "out_for_delivery", "delivered"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }
    const updated = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: "Order not found." });
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ message: "Could not update order status.", error: error.message });
  }
});

router.delete("/:id", authRequired, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found." });

    const isAdmin = req.user.role === "admin";
    const isOwner = order.customerId.equals(new mongoose.Types.ObjectId(req.user.id));
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await order.deleteOne();
    return res.json({ message: "Order deleted." });
  } catch (error) {
    return res.status(500).json({ message: "Could not delete order.", error: error.message });
  }
});

export default router;
