import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    mobile: { type: String, default: "" },
    deliveryAddress: {
      fullName: { type: String, default: "" },
      phone: { type: String, default: "" },
      line1: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      zip: { type: String, default: "" }
    },
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
    refreshToken: { type: String, default: "" }
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
