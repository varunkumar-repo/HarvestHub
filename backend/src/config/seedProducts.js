import { Product } from "../models/Product.js";

const SEEDED_PRODUCTS = [
  { name: "Cow Milk", category: "Dairy", unit: "1L", price: 68, stock: 40, image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=1200&q=80" },
  { name: "Buffalo Milk", category: "Dairy", unit: "1L", price: 74, stock: 30, image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=1200&q=80" },
  { name: "Natukodi Eggs", category: "Dairy", unit: "1 pcs", price: 14, stock: 120, image: "https://images.unsplash.com/photo-1518569656558-1f25e69d93d7?auto=format&fit=crop&w=1200&q=80" },
  { name: "Tomato", category: "Vegetables", unit: "1kg", price: 52, stock: 36, image: "https://images.unsplash.com/photo-1546470427-e26264be0b1b?auto=format&fit=crop&w=1200&q=80" },
  { name: "Spinach", category: "Vegetables", unit: "500grams", price: 40, stock: 24, image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=1200&q=80" },
  { name: "Potato", category: "Vegetables", unit: "1kg", price: 38, stock: 45, image: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=1200&q=80" },
  { name: "Green Chilli", category: "Vegetables", unit: "500grams", price: 56, stock: 32, image: "https://images.unsplash.com/photo-1524593656068-5f14f5c0a4a1?auto=format&fit=crop&w=1200&q=80" },
  { name: "Banana", category: "Fruits", unit: "dozen", price: 62, stock: 34, image: "https://images.unsplash.com/photo-1603833665858-e61d17a86224?auto=format&fit=crop&w=1200&q=80" },
  { name: "Papaya", category: "Fruits", unit: "1kg", price: 78, stock: 29, image: "https://images.unsplash.com/photo-1615485737455-1bb8b45c6d02?auto=format&fit=crop&w=1200&q=80" },
  { name: "Pomegranate", category: "Fruits", unit: "1kg", price: 170, stock: 26, image: "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=1200&q=80" },
  { name: "Sona Masoori Rice", category: "Grains", unit: "1kg", price: 72, stock: 180, image: "https://images.unsplash.com/photo-1604908177453-7462950a6a3e?auto=format&fit=crop&w=1200&q=80" }
];

export async function seedProducts() {
  for (const product of SEEDED_PRODUCTS) {
    const existing = await Product.findOne({ image: product.image });
    if (existing) continue;
    await Product.create(product);
  }
}
