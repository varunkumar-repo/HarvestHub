import { Product } from "../models/Product.js";

const SEEDED_PRODUCTS = [
  { name: "Cow Milk", category: "Dairy", unit: "1L", price: 68, stock: 40, image: "assets/cow-milk.jpg" },
  { name: "Buffalo Milk", category: "Dairy", unit: "1L", price: 74, stock: 30, image: "assets/buffalo-milk.jpg" },
  { name: "Natukodi Eggs", category: "Dairy", unit: "1 pcs", price: 14, stock: 120, image: "assets/natukodi eggs.jpg" },
  { name: "Tomato", category: "Vegetables", unit: "1kg", price: 52, stock: 36, image: "assets/tomatoes.jpg" },
  { name: "Spinach", category: "Vegetables", unit: "500grams", price: 40, stock: 24, image: "assets/spinach.jpg" },
  { name: "Potato", category: "Vegetables", unit: "1kg", price: 38, stock: 45, image: "assets/potato.jpg" },
  { name: "Green Chilli", category: "Vegetables", unit: "500grams", price: 56, stock: 32, image: "assets/green-chilli.jpg" },
  { name: "Banana", category: "Fruits", unit: "dozen", price: 62, stock: 34, image: "assets/banana.jpg" },
  { name: "Papaya", category: "Fruits", unit: "1kg", price: 78, stock: 29, image: "assets/papaya.jpg" },
  { name: "Pomegranate", category: "Fruits", unit: "1kg", price: 170, stock: 26, image: "assets/pomogranate.jpg" },
  { name: "Sona Masoori Rice", category: "Grains", unit: "1kg", price: 72, stock: 180, image: "assets/sonamasori rice.jpg" }
];

export async function seedProducts() {
  for (const product of SEEDED_PRODUCTS) {
    const existing = await Product.findOne({ image: product.image });
    if (existing) continue;
    await Product.create(product);
  }
}

