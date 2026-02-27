import mongoose from "mongoose";

const orderLineSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    total: { type: Number, required: true, min: 0 },
    lines: { type: [orderLineSchema], default: [] },
    deliveryName: { type: String, required: true },
    deliveryContact: { type: String, required: true },
    deliveryAddress: { type: String, required: true },
    estimatedDelivery: { type: String, default: "" },
    status: {
      type: String,
      enum: ["placed", "accepted", "out_for_delivery", "delivered"],
      default: "placed"
    }
  },
  { timestamps: true }
);

export const Order = mongoose.model("Order", orderSchema);
