const PRODUCTS_KEY = "fm_products";
const ORDERS_KEY = "fm_orders";
const ADDRESS_KEY = "fm_address";
const CART_KEY = "fm_cart";

const defaultProducts = [
  {
    id: "p1",
    name: "Cow Milk 1L",
    category: "Dairy",
    price: 68,
    stock: 40,
    image: "assets/cow-milk.jpg"
  },
  {
    id: "p2",
    name: "Buffalo Milk 1L",
    category: "Dairy",
    price: 74,
    stock: 30,
    image: "assets/buffalo-milk.jpg"
  },
  {
    id: "p3",
    name: "Farm Tomato 1kg",
    category: "Vegetables",
    price: 52,
    stock: 36,
    image: "assets/tomatoes.jpg"
  },
  {
    id: "p4",
    name: "Village Spinach 500g",
    category: "Vegetables",
    price: 40,
    stock: 24,
    image: "assets/spinach.jpg"
  },
  {
    id: "p6",
    name: "Banana 1 Dozen",
    category: "Fruits",
    price: 62,
    stock: 34,
    image: "assets/banana.jpg"
  },
  {
    id: "p7",
    name: "Sona Masoori Rice Bag 10kg",
    category: "Grains",
    price: 720,
    stock: 18,
    image: "assets/sonamasori rice.jpg"
  },
  {
    id: "p9",
    name: "Fresh Potato 1kg",
    category: "Vegetables",
    price: 38,
    stock: 45,
    image: "assets/potato.jpg"
  },
  {
    id: "p10",
    name: "Green Chilli 250g",
    category: "Vegetables",
    price: 28,
    stock: 32,
    image: "assets/green-chilli.jpg"
  },
  {
    id: "p11",
    name: "Pomegranate 1kg",
    category: "Fruits",
    price: 170,
    stock: 26,
    image: "assets/pomogranate.jpg"
  },
  {
    id: "p12",
    name: "Papaya 1kg",
    category: "Fruits",
    price: 78,
    stock: 29,
    image: "assets/papaya.jpg"
  },
  {
    id: "p13",
    name: "Natukodi Eggs (6 pcs)",
    category: "Dairy",
    price: 84,
    stock: 40,
    image: "assets/natukodi eggs.jpg"
  }
];

function loadJSON(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveJSON(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function getProducts() {
  const products = loadJSON(PRODUCTS_KEY, null);
  if (products) {
    const removedIds = new Set(["p5", "p8"]);
    const migrated = products
      .filter((item) => !removedIds.has(item.id))
      .map((item) => {
      if (item.id === "p1") {
        return { ...item, image: "assets/cow-milk.jpg" };
      }
      if (item.id === "p2") {
        return { ...item, image: "assets/buffalo-milk.jpg" };
      }
      if (item.id === "p3") {
        return { ...item, image: "assets/tomatoes.jpg" };
      }
      if (item.id === "p4") {
        return { ...item, image: "assets/spinach.jpg" };
      }
      if (item.id === "p6") {
        return { ...item, image: "assets/banana.jpg" };
      }
      if (item.id === "p7") {
        return { ...item, image: "assets/sonamasori rice.jpg" };
      }
      if (item.id === "p9") {
        return { ...item, image: "assets/potato.jpg" };
      }
      if (item.id === "p10") {
        return { ...item, image: "assets/green-chilli.jpg" };
      }
      if (item.id === "p11") {
        return { ...item, image: "assets/pomogranate.jpg" };
      }
      if (item.id === "p12") {
        return { ...item, image: "assets/papaya.jpg" };
      }
      if (item.id === "p13") {
        return { ...item, image: "assets/natukodi eggs.jpg" };
      }
      return item;
    });
    const existingIds = new Set(migrated.map((item) => item.id));
    const appended = defaultProducts.filter((item) => !existingIds.has(item.id));
    const merged = [...migrated, ...appended];
    saveJSON(PRODUCTS_KEY, merged);
    return merged;
  }
  saveJSON(PRODUCTS_KEY, defaultProducts);
  return [...defaultProducts];
}
