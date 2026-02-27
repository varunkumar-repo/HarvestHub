requireRole("customer", "customer-login.html");

const currentUser = getUser();

function userScopeCandidates(user) {
  const values = [
    user?.id,
    user?._id,
    user?.email ? String(user.email).toLowerCase().trim() : "",
    user?.mobile
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
  if (!values.length) values.push("guest");
  return [...new Set(values)];
}

function loadFirstExistingJson(keys, fallback = null) {
  for (const key of keys) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      return JSON.parse(raw);
    } catch {
      continue;
    }
  }
  return fallback;
}

const scopeCandidates = userScopeCandidates(currentUser);
const primaryScope = scopeCandidates[0];
const CART_KEY_SCOPED = `${CART_KEY}_${primaryScope}`;
const ADDRESS_KEY_SCOPED = `${ADDRESS_KEY}_${primaryScope}`;
const PROFILE_KEY_SCOPED = `fm_profile_${primaryScope}`;
const ADDRESS_KEYS = [...scopeCandidates.map((s) => `${ADDRESS_KEY}_${s}`), ADDRESS_KEY, `${ADDRESS_KEY}_guest`];
const PROFILE_KEYS = [...scopeCandidates.map((s) => `fm_profile_${s}`), "fm_profile_guest"];
const CART_KEYS = [...scopeCandidates.map((s) => `${CART_KEY}_${s}`), CART_KEY, `${CART_KEY}_guest`];

const state = {
  products: [],
  cart: loadFirstExistingJson(CART_KEYS, []),
  orders: [],
  address: loadFirstExistingJson(ADDRESS_KEYS, null),
  profile: loadFirstExistingJson(PROFILE_KEYS, null),
  view: "products",
  activeCategory: "all",
  profileEditMode: false,
  addressEditMode: false
};

function saveForAllScopes(baseKey, value) {
  scopeCandidates.forEach((s) => saveJSON(`${baseKey}_${s}`, value));
}

saveForAllScopes(CART_KEY, state.cart || []);
if (state.address) saveForAllScopes(ADDRESS_KEY, state.address);
if (state.profile) saveForAllScopes("fm_profile", state.profile);

const refs = {
  navButtons: [...document.querySelectorAll(".nav-btn")],
  productsView: document.getElementById("productsView"),
  cartView: document.getElementById("cartView"),
  ordersView: document.getElementById("ordersView"),
  customerHero: document.getElementById("customerHero"),
  productGrid: document.getElementById("productGrid"),
  productCardTpl: document.getElementById("productCardTpl"),
  searchInput: document.getElementById("searchInput"),
  activeCategoryLabel: document.getElementById("activeCategoryLabel"),
  backFromCategoryBtn: document.getElementById("backFromCategoryBtn"),
  cartItems: document.getElementById("cartItems"),
  cartTotal: document.getElementById("cartTotal"),
  ordersList: document.getElementById("ordersList"),
  checkoutBtn: document.getElementById("checkoutBtn"),
  profileToggle: document.getElementById("profileToggle"),
  profileMenu: document.getElementById("profileMenu"),
  profileForm: document.getElementById("profileForm"),
  savedProfile: document.getElementById("savedProfile"),
  editProfileBtn: document.getElementById("editProfileBtn"),
  addressForm: document.getElementById("addressForm"),
  savedAddress: document.getElementById("savedAddress"),
  editAddressBtn: document.getElementById("editAddressBtn"),
  logoutCustomer: document.getElementById("logoutCustomer")
};
const CATEGORY_ORDER = ["Dairy", "Vegetables", "Fruits", "Grains"];

function currency(v) {
  return `Rs ${Number(v || 0).toFixed(0)}`;
}

function priceWithUnit(product) {
  const unit = (product?.unit || "unit").trim();
  const rawUnit = unit.startsWith("/") ? unit.slice(1).trim() : unit;
  const unitMap = {
    "1kg": "1 kg",
    "500grams": "500 g",
    "500ml": "500 ml",
    "1L": "1 L",
    "1pcs": "1 pcs"
  };
  const cleanUnit = unitMap[rawUnit] || rawUnit;
  return `${currency(product.price)} / ${cleanUnit}`;
}

async function fetchProducts() {
  const data = await apiFetch("/products");
  state.products = data.map((p) => ({ ...p, id: p._id }));
  const validIds = new Set(state.products.map((p) => p.id));
  state.cart = state.cart
    .filter((item) => validIds.has(item.productId))
    .map((item) => {
      const product = state.products.find((p) => p.id === item.productId);
      if (!product) return item;
      return { ...item, qty: Math.min(item.qty, product.stock) };
    })
    .filter((item) => item.qty > 0);
  saveJSON(CART_KEY_SCOPED, state.cart);
  saveForAllScopes(CART_KEY, state.cart);
}

async function fetchOrders() {
  const data = await apiFetch("/orders");
  state.orders = data
    .map((o) => ({
      id: o._id,
      placedAt: o.createdAt || "",
      date: new Date(o.createdAt).toLocaleString(),
      estimatedDelivery: o.estimatedDelivery || "N/A",
      status: o.status || "placed",
      total: o.total || 0,
      lines: o.lines || []
    }))
    .sort((a, b) => Date.parse(b.placedAt) - Date.parse(a.placedAt));
}

async function syncCustomerProfileFromServer() {
  const response = await apiFetch("/auth/me");
  const serverUser = response?.user;
  if (!serverUser || serverUser.role !== "customer") return;

  state.profile = {
    username: serverUser.fullName || "",
    mobile: serverUser.mobile || ""
  };
  const address = serverUser.deliveryAddress || {};
  if (address.fullName && address.phone && address.line1 && address.city && address.state && address.zip) {
    state.address = {
      fullName: address.fullName,
      phone: address.phone,
      line1: address.line1,
      city: address.city,
      state: address.state,
      zip: address.zip
    };
  } else {
    state.address = null;
  }

  saveForAllScopes("fm_profile", state.profile);
  if (state.address) saveForAllScopes(ADDRESS_KEY, state.address);
}

function formatOrderStatus(status) {
  return String(status || "placed")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function setView(view) {
  state.view = view;
  refs.navButtons.forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  refs.productsView.classList.toggle("visible", view === "products");
  refs.cartView.classList.toggle("visible", view === "cart");
  refs.ordersView.classList.toggle("visible", view === "orders");
  refs.customerHero.style.display = view === "products" ? "grid" : "none";
}

function filteredProducts() {
  const q = refs.searchInput.value.trim().toLowerCase();
  const c = state.activeCategory;
  return state.products.filter((p) => {
    const byText = !q || p.name.toLowerCase().includes(q);
    const byCategory = c === "all" || c === p.category;
    return byText && byCategory;
  });
}

function addToCart(productId) {
  const product = state.products.find((p) => p.id === productId);
  if (!product || product.stock <= 0) return;
  const existing = state.cart.find((i) => i.productId === productId);
  if (existing) {
    if (existing.qty < product.stock) existing.qty += 1;
  } else {
    state.cart.push({ productId, qty: 1 });
  }
  saveJSON(CART_KEY, state.cart);
  saveJSON(CART_KEY_SCOPED, state.cart);
  saveForAllScopes(CART_KEY, state.cart);
  renderProducts();
  renderCart();
}

function updateCart(productId, qty) {
  const product = state.products.find((p) => p.id === productId);
  if (!product) return;
  const item = state.cart.find((i) => i.productId === productId);
  if (!item) return;
  if (qty <= 0) {
    state.cart = state.cart.filter((i) => i.productId !== productId);
  } else {
    item.qty = Math.min(qty, product.stock);
  }
  saveJSON(CART_KEY_SCOPED, state.cart);
  saveForAllScopes(CART_KEY, state.cart);
  renderProducts();
  renderCart();
}

function cartQty(productId) {
  return state.cart.find((item) => item.productId === productId)?.qty || 0;
}

function buildProductCard(p) {
  const node = refs.productCardTpl.content.firstElementChild.cloneNode(true);
  node.querySelector("img").src = p.image;
  node.querySelector("img").alt = p.name;
  const chip = node.querySelector(".chip");
  const isLowStock = p.stock > 0 && p.stock < 20;
  chip.textContent = isLowStock ? `${p.category} | Getting out of stock` : p.category;
  chip.classList.toggle("low-stock", isLowStock);
  node.querySelector("h3").textContent = p.name;
  node.querySelector(".price").textContent = priceWithUnit(p);
  const btn = node.querySelector(".add-btn");
  const qtyControls = node.querySelector(".qty-controls");
  const qtyValue = node.querySelector(".qty-value");
  const decBtn = node.querySelector(".dec-btn");
  const incBtn = node.querySelector(".inc-btn");
  const qty = cartQty(p.id);

  btn.disabled = p.stock <= 0;
  btn.textContent = p.stock <= 0 ? "Out of stock" : "Add";
  btn.addEventListener("click", () => addToCart(p.id));
  decBtn.addEventListener("click", () => updateCart(p.id, qty - 1));
  incBtn.addEventListener("click", () => updateCart(p.id, qty + 1));

  if (qty > 0) {
    btn.style.display = "none";
    qtyControls.style.display = "flex";
    qtyValue.textContent = qty.toString();
    incBtn.disabled = qty >= p.stock;
  } else {
    btn.style.display = "inline-block";
    qtyControls.style.display = "none";
  }
  return node;
}

function createProductsGrid(products) {
  const grid = document.createElement("div");
  grid.className = "product-grid";
  products.forEach((p) => grid.appendChild(buildProductCard(p)));
  return grid;
}

function renderCategoryBackButton() {
  if (!refs.backFromCategoryBtn) return;
  const activeCategory = state.activeCategory !== "all";
  refs.backFromCategoryBtn.style.display = activeCategory ? "inline-flex" : "none";
  if (refs.activeCategoryLabel) {
    refs.activeCategoryLabel.style.display = activeCategory ? "inline-flex" : "none";
    refs.activeCategoryLabel.textContent = activeCategory ? state.activeCategory : "";
  }
}

function renderGroupedProducts(products) {
  const grouped = new Map();
  products.forEach((p) => {
    const category = p.category || "Other";
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category).push(p);
  });

  const orderedCategories = [...CATEGORY_ORDER, ...[...grouped.keys()].filter((c) => !CATEGORY_ORDER.includes(c))];
  orderedCategories.forEach((category) => {
    const categoryProducts = grouped.get(category) || [];
    if (!categoryProducts.length) return;
    const block = document.createElement("section");
    block.className = "category-block";
    const head = document.createElement("div");
    head.className = "category-head";
    head.innerHTML = `
      <h3 class="category-title">${category}</h3>
      <button class="category-see-all" type="button" data-category="${category}">See All &gt;</button>
    `;
    head.querySelector(".category-see-all").addEventListener("click", () => {
      state.activeCategory = category;
      renderProducts();
    });
    block.appendChild(head);
    const carousel = createProductsGrid(categoryProducts);
    carousel.classList.add("product-carousel");
    block.appendChild(carousel);
    refs.productGrid.appendChild(block);
  });
}

function renderProducts() {
  refs.productGrid.innerHTML = "";
  renderCategoryBackButton();
  const products = filteredProducts();
  if (!products.length) {
    refs.productGrid.innerHTML = "<p>No products found.</p>";
    return;
  }

  const query = refs.searchInput.value.trim();
  const showGrouped = !query && state.activeCategory === "all";
  if (showGrouped) {
    renderGroupedProducts(products);
    return;
  }
  refs.productGrid.appendChild(createProductsGrid(products));
}

function renderCart() {
  refs.cartItems.innerHTML = "";
  let total = 0;
  if (!state.cart.length) refs.cartItems.innerHTML = "<p>Your cart is empty.</p>";
  state.cart.forEach((item) => {
    const p = state.products.find((x) => x.id === item.productId);
    if (!p) return;
    total += p.price * item.qty;
    const row = document.createElement("div");
    row.className = "item-card";
    row.innerHTML = `
      <div>
        <h4>${p.name}</h4>
        <p>${item.qty} x ${priceWithUnit(p)}</p>
      </div>
      <div class="actions">
        <button class="btn ghost dec">-</button>
        <button class="btn ghost inc">+</button>
        <button class="btn danger del">Remove</button>
      </div>
    `;
    row.querySelector(".dec").addEventListener("click", () => updateCart(p.id, item.qty - 1));
    row.querySelector(".inc").addEventListener("click", () => updateCart(p.id, item.qty + 1));
    row.querySelector(".del").addEventListener("click", () => updateCart(p.id, 0));
    refs.cartItems.appendChild(row);
  });
  refs.cartTotal.textContent = total.toFixed(0);
}

function renderOrders() {
  refs.ordersList.innerHTML = "";
  if (!state.orders.length) {
    refs.ordersList.innerHTML = "<p>No previous orders yet.</p>";
    return;
  }
  state.orders.forEach((order) => {
    const div = document.createElement("div");
    div.className = "item-card";
    div.innerHTML = `
      <div>
        <h4>${order.id} <span class="order-status-chip">${formatOrderStatus(order.status)}</span></h4>
        <p>${order.date}</p>
        <p><strong>Estimated delivery:</strong> ${order.estimatedDelivery}</p>
        <p>${(order.lines || []).map((l) => `${l.name} (${l.qty})`).join(", ")}</p>
      </div>
      <div class="order-actions">
        <strong>${currency(order.total)}</strong>
        <button class="btn danger mini icon-delete-btn" type="button" data-order-id="${order.id}" aria-label="Delete order" title="Delete order">&#128465;</button>
      </div>
    `;
    refs.ordersList.appendChild(div);
  });
  refs.ordersList.querySelectorAll(".icon-delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const ok = window.confirm("Do you want to delete this order?");
      if (!ok) return;
      try {
        await apiFetch(`/orders/${btn.dataset.orderId}`, { method: "DELETE" });
        await fetchOrders();
        renderOrders();
      } catch (error) {
        alert(error.message || "Could not delete order.");
      }
    });
  });
}

function renderAddress() {
  if (!state.address) {
    refs.savedAddress.textContent = "No address saved. Add address to continue checkout.";
    refs.addressForm.style.display = "grid";
    refs.editAddressBtn.style.display = "none";
    refs.editAddressBtn.textContent = "Edit";
    return;
  }

  refs.savedAddress.innerHTML = `
    <strong>${state.address.fullName}</strong><br>
    ${state.address.phone}<br>
    ${state.address.line1}, ${state.address.city}, ${state.address.state} - ${state.address.zip}
  `;
  refs.editAddressBtn.style.display = "inline-flex";
  refs.editAddressBtn.textContent = state.addressEditMode ? "Cancel" : "Edit";
  refs.addressForm.style.display = state.addressEditMode ? "grid" : "none";
}

function renderProfile() {
  if (!state.profile) {
    refs.savedProfile.textContent = "No profile saved.";
    refs.profileForm.style.display = "grid";
    refs.editProfileBtn.style.display = "none";
    refs.editProfileBtn.textContent = "Edit";
    return;
  }
  refs.savedProfile.innerHTML = `
    <strong>${state.profile.username}</strong><br>
    ${state.profile.mobile}
  `;
  refs.editProfileBtn.style.display = "inline-flex";
  refs.editProfileBtn.textContent = state.profileEditMode ? "Cancel" : "Edit";
  refs.profileForm.style.display = state.profileEditMode ? "grid" : "none";
}

async function checkout() {
  if (!state.address) {
    alert("Please save delivery address in Profile first.");
    return;
  }
  if (!state.cart.length) {
    alert("Cart is empty.");
    return;
  }

  const lines = state.cart
    .map((item) => ({ productId: item.productId, qty: item.qty }))
    .filter((item) => item.qty > 0);

  try {
    await apiFetch("/orders", {
      method: "POST",
      body: JSON.stringify({
        lines,
        deliveryName: state.address.fullName || state.profile?.username || "N/A",
        deliveryContact: state.address.phone || state.profile?.mobile || "N/A",
        deliveryAddress: `${state.address.line1}, ${state.address.city}, ${state.address.state} - ${state.address.zip}`
      })
    });

    state.cart = [];
    saveJSON(CART_KEY_SCOPED, state.cart);
    saveForAllScopes(CART_KEY, state.cart);
    await fetchProducts();
    await fetchOrders();
    renderProducts();
    renderCart();
    renderOrders();
    setView("orders");
  } catch (error) {
    alert(error.message || "Checkout failed.");
  }
}

refs.navButtons.forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
refs.searchInput.addEventListener("input", renderProducts);
refs.backFromCategoryBtn?.addEventListener("click", () => {
  state.activeCategory = "all";
  refs.searchInput.value = "";
  renderProducts();
});
refs.checkoutBtn.addEventListener("click", checkout);
refs.profileToggle.addEventListener("click", () => refs.profileMenu.classList.toggle("open"));
document.addEventListener("click", (e) => {
  if (!e.target.closest(".profile-wrap")) refs.profileMenu.classList.remove("open");
});
refs.addressForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = Object.fromEntries(new FormData(refs.addressForm).entries());
  state.address = payload;
  state.addressEditMode = false;
  saveJSON(ADDRESS_KEY_SCOPED, state.address);
  saveForAllScopes(ADDRESS_KEY, state.address);
  renderAddress();
  try {
    const response = await apiFetch("/auth/me/address", {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    const address = response?.user?.deliveryAddress || payload;
    state.address = {
      fullName: address.fullName || "",
      phone: address.phone || "",
      line1: address.line1 || "",
      city: address.city || "",
      state: address.state || "",
      zip: address.zip || ""
    };
    state.addressEditMode = false;
    saveJSON(ADDRESS_KEY_SCOPED, state.address);
    saveForAllScopes(ADDRESS_KEY, state.address);
    renderAddress();
    alert("Address saved.");
  } catch (error) {
    alert(`${error.message || "Could not save address on server."} Saved locally on this device.`);
  }
});
refs.profileForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = Object.fromEntries(new FormData(refs.profileForm).entries());
  state.profile = payload;
  state.profileEditMode = false;
  saveJSON(PROFILE_KEY_SCOPED, state.profile);
  saveForAllScopes("fm_profile", state.profile);
  renderProfile();
  try {
    const response = await apiFetch("/auth/me/profile", {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    state.profile = {
      username: response?.user?.fullName || payload.username || "",
      mobile: response?.user?.mobile || payload.mobile || ""
    };
    state.profileEditMode = false;
    saveJSON(PROFILE_KEY_SCOPED, state.profile);
    saveForAllScopes("fm_profile", state.profile);
    renderProfile();
    alert("Profile saved.");
  } catch (error) {
    alert(`${error.message || "Could not save profile on server."} Saved locally on this device.`);
  }
});
refs.editProfileBtn.addEventListener("click", () => {
  if (!state.profile) return;
  state.profileEditMode = !state.profileEditMode;
  if (state.profileEditMode) {
    refs.profileForm.username.value = state.profile.username || "";
    refs.profileForm.mobile.value = state.profile.mobile || "";
  }
  renderProfile();
});
refs.editAddressBtn.addEventListener("click", () => {
  if (!state.address) return;
  state.addressEditMode = !state.addressEditMode;
  if (state.addressEditMode) {
    refs.addressForm.fullName.value = state.address.fullName || "";
    refs.addressForm.phone.value = state.address.phone || "";
    refs.addressForm.line1.value = state.address.line1 || "";
    refs.addressForm.city.value = state.address.city || "";
    refs.addressForm.state.value = state.address.state || "";
    refs.addressForm.zip.value = state.address.zip || "";
  }
  renderAddress();
});
refs.logoutCustomer.addEventListener("click", () => {
  logoutSession().finally(() => {
    window.location.href = "customer-login.html";
  });
});

async function initCustomer() {
  try {
    try {
      await syncCustomerProfileFromServer();
    } catch (error) {
      console.warn("Profile sync failed:", error?.message || error);
    }
    await fetchProducts();
    await fetchOrders();
    renderProducts();
    renderCart();
    renderOrders();
  } catch (error) {
    alert(error.message || "Could not load customer data.");
  }
  setView("products");
  renderProfile();
  renderAddress();
}

initCustomer();
