requireRole("admin", "admin-login.html");

const state = {
  products: [],
  orders: []
};

const refs = {
  adminTabButtons: [...document.querySelectorAll("[data-admin-view]")],
  addProductView: document.getElementById("addProductView"),
  inventoryView: document.getElementById("inventoryView"),
  recentOrdersView: document.getElementById("recentOrdersView"),
  pastOrdersView: document.getElementById("pastOrdersView"),
  productForm: document.getElementById("productForm"),
  adminSearchInput: document.getElementById("adminSearchInput"),
  adminCategoryFilter: document.getElementById("adminCategoryFilter"),
  adminTable: document.getElementById("adminTable"),
  recentOrdersBtn: document.getElementById("recentOrdersBtn"),
  filterDateInput: document.getElementById("filterDateInput"),
  filterDateBtn: document.getElementById("filterDateBtn"),
  filterMonthInput: document.getElementById("filterMonthInput"),
  filterMonthBtn: document.getElementById("filterMonthBtn"),
  adminRecentOrdersList: document.getElementById("adminRecentOrdersList"),
  adminPastOrdersList: document.getElementById("adminPastOrdersList"),
  logoutAdmin: document.getElementById("logoutAdmin")
};

function currency(v) {
  return `Rs ${Number(v || 0).toFixed(0)}`;
}

function unitOptionsHtml(selectedUnit) {
  const units = ["1kg", "500grams", "1L", "500ml", "dozen", "1 set", "1 pcs"];
  return units.map((unit) => {
    const selected = selectedUnit === unit ? "selected" : "";
    return `<option value="${unit}" ${selected}>${unit}</option>`;
  }).join("");
}

function statusOptionsHtml(selectedStatus) {
  const statuses = [
    { value: "placed", label: "Placed" },
    { value: "accepted", label: "Order Accepted" },
    { value: "out_for_delivery", label: "Out for Delivery" },
    { value: "delivered", label: "Delivered" }
  ];
  return statuses.map((s) => {
    const selected = selectedStatus === s.value ? "selected" : "";
    return `<option value="${s.value}" ${selected}>${s.label}</option>`;
  }).join("");
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

function getOrderTime(order) {
  const parsed = Date.parse(order.date || "");
  return Number.isNaN(parsed) ? 0 : parsed;
}

function activeOrders() {
  return state.orders.filter((order) => order.status !== "delivered");
}

function deliveredOrders() {
  return state.orders.filter((order) => order.status === "delivered");
}

async function fetchProducts() {
  const data = await apiFetch("/products");
  state.products = data.map((p) => ({ ...p, id: p._id }));
}

async function fetchOrders() {
  const data = await apiFetch("/orders");
  state.orders = data
    .map((o) => ({
      id: o._id,
      placedAt: o.createdAt || "",
      date: new Date(o.createdAt).toLocaleString(),
      estimatedDelivery: o.estimatedDelivery || "N/A",
      deliveryName: o.deliveryName || "N/A",
      deliveryContact: o.deliveryContact || "N/A",
      deliveryAddress: o.deliveryAddress || "N/A",
      status: o.status || "placed",
      total: o.total || 0,
      lines: o.lines || []
    }))
    .sort((a, b) => Date.parse(b.placedAt) - Date.parse(a.placedAt));
}

function filteredProducts() {
  const q = refs.adminSearchInput.value.trim().toLowerCase();
  const category = refs.adminCategoryFilter.value;
  return state.products.filter((p) => {
    const byText = !q || p.name.toLowerCase().includes(q);
    const byCategory = category === "all" || p.category === category;
    return byText && byCategory;
  });
}

function renderTable() {
  refs.adminTable.innerHTML = "";
  const items = filteredProducts();
  if (!items.length) {
    refs.adminTable.innerHTML = "<p>No products match current filter.</p>";
    return;
  }
  items.forEach((p) => {
    const row = document.createElement("div");
    row.className = "admin-row";
    row.innerHTML = `
      <img src="${p.image}" alt="${p.name}">
      <div>
        <strong>${p.name}</strong>
        <p>${p.category}</p>
      </div>
      <label class="metric metric-price">
        <span>Price + Unit</span>
        <input class="price-input" type="number" min="1" value="${p.price}">
        <select class="unit-input">${unitOptionsHtml(p.unit || "kg")}</select>
      </label>
      <label class="metric metric-stock">
        <span>Stock Qty</span>
        <input class="stock-input" type="number" min="0" value="${p.stock}">
      </label>
      <button class="btn ghost save">Save</button>
      <button class="btn danger delete">Delete</button>
    `;
    row.querySelector(".save").addEventListener("click", async () => {
      const price = Number(row.querySelector(".price-input").value);
      const unit = row.querySelector(".unit-input").value.trim();
      const stock = Number(row.querySelector(".stock-input").value);
      if (price < 1 || stock < 0 || !unit) {
        alert("Invalid values.");
        return;
      }
      try {
        await apiFetch(`/products/${p.id}`, {
          method: "PUT",
          body: JSON.stringify({ price, unit, stock })
        });
        await fetchProducts();
        renderTable();
        alert("Updated.");
      } catch (error) {
        alert(error.message || "Could not update product.");
      }
    });
    row.querySelector(".delete").addEventListener("click", async () => {
      const ok = window.confirm("Do you want to delete this product?");
      if (!ok) return;
      try {
        await apiFetch(`/products/${p.id}`, { method: "DELETE" });
        await fetchProducts();
        renderTable();
      } catch (error) {
        alert(error.message || "Could not delete product.");
      }
    });
    refs.adminTable.appendChild(row);
  });
}

function renderOrders(orders) {
  return orders.map((order) => {
    const items = (order.lines || []).map((line) => `${line.name} x${line.qty}`).join(", ") || "N/A";
    return `
      <div class="item-card admin-order-simple">
        <div class="order-meta">
          <h4>${order.id}</h4>
          <p>${order.date || "N/A"}</p>
          <p><strong>ETA:</strong> ${order.estimatedDelivery}</p>
          <p><strong>Status:</strong> ${order.status.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}</p>
          <p><strong>Name:</strong> ${order.deliveryName} | <strong>Contact:</strong> ${order.deliveryContact}</p>
          <p><strong>Address:</strong> ${order.deliveryAddress}</p>
          <p><strong>Items:</strong> ${items}</p>
        </div>
        <div class="order-actions">
          <select class="order-status-select" data-order-id="${order.id}">
            ${statusOptionsHtml(order.status)}
          </select>
          <button class="btn ghost mini save-order-status-btn" data-order-id="${order.id}" type="button">Save Status</button>
          <strong class="order-total">${currency(order.total || 0)}</strong>
          <button class="btn danger mini icon-delete-btn admin-icon-delete-btn delete-order-btn" data-order-id="${order.id}" type="button" aria-label="Delete order" title="Delete order">&#128465;</button>
        </div>
      </div>
    `;
  }).join("");
}

function setAdminView(viewId) {
  refs.addProductView.classList.toggle("visible", viewId === "addProductView");
  refs.inventoryView.classList.toggle("visible", viewId === "inventoryView");
  refs.recentOrdersView.classList.toggle("visible", viewId === "recentOrdersView");
  refs.pastOrdersView.classList.toggle("visible", viewId === "pastOrdersView");
  refs.adminTabButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.adminView === viewId));
}

function renderRecentOrdersList(orders) {
  refs.adminRecentOrdersList.innerHTML = "";
  if (!orders.length) {
    refs.adminRecentOrdersList.innerHTML = "<p>No recent orders found.</p>";
    return;
  }
  refs.adminRecentOrdersList.innerHTML = renderOrders(orders);
  refs.adminRecentOrdersList.querySelectorAll(".delete-order-btn").forEach((btn) => {
    btn.addEventListener("click", () => deleteOrder(btn.dataset.orderId));
  });
  bindStatusControls(refs.adminRecentOrdersList);
}

function renderPastOrdersList(orders) {
  refs.adminPastOrdersList.innerHTML = "";
  if (!orders.length) {
    refs.adminPastOrdersList.innerHTML = "<p>No matching past orders found.</p>";
    return;
  }
  refs.adminPastOrdersList.innerHTML = renderOrders(orders);
  refs.adminPastOrdersList.querySelectorAll(".delete-order-btn").forEach((btn) => {
    btn.addEventListener("click", () => deleteOrder(btn.dataset.orderId));
  });
  bindStatusControls(refs.adminPastOrdersList);
}

function setSaveStatusButtonState(button, isDirty) {
  if (!button) return;
  button.classList.toggle("dirty", isDirty);
  button.classList.toggle("clean", !isDirty);
}

function bindStatusControls(container) {
  container.querySelectorAll(".save-order-status-btn").forEach((btn) => {
    setSaveStatusButtonState(btn, false);
    btn.addEventListener("click", () => saveOrderStatus(btn.dataset.orderId, container, btn));
  });

  container.querySelectorAll(".order-status-select").forEach((select) => {
    select.addEventListener("change", () => {
      const btn = container.querySelector(`.save-order-status-btn[data-order-id="${select.dataset.orderId}"]`);
      setSaveStatusButtonState(btn, true);
    });
  });
}

async function saveOrderStatus(orderId, container, triggerButton = null) {
  const select = container.querySelector(`.order-status-select[data-order-id="${orderId}"]`);
  if (!select) return;
  const status = select.value;
  try {
    await apiFetch(`/orders/${orderId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status })
    });
    await fetchOrders();
    const recent = [...activeOrders()]
      .sort((a, b) => getOrderTime(b) - getOrderTime(a))
      .slice(0, 12);
    renderRecentOrdersList(recent);
    applyPastFilters();
    setSaveStatusButtonState(triggerButton, false);
  } catch (error) {
    alert(error.message || "Could not update order status.");
    setSaveStatusButtonState(triggerButton, true);
  }
}

async function renderRecentOrders() {
  await fetchOrders();
  const recent = [...activeOrders()]
    .sort((a, b) => getOrderTime(b) - getOrderTime(a))
    .slice(0, 12);
  renderRecentOrdersList(recent);
}

function applyPastFilters() {
  const past = deliveredOrders();
  if (refs.filterDateInput.value) {
    filterByDate(refs.filterDateInput.value, past);
    return;
  }
  if (refs.filterMonthInput.value) {
    filterByMonth(refs.filterMonthInput.value, past);
    return;
  }
  renderPastOrdersList(past);
}

async function deleteOrder(orderId) {
  const ok = window.confirm("Do you want to delete this order?");
  if (!ok) return;
  try {
    await apiFetch(`/orders/${orderId}`, { method: "DELETE" });
    await fetchOrders();
    const recent = [...activeOrders()]
      .sort((a, b) => getOrderTime(b) - getOrderTime(a))
      .slice(0, 12);
    renderRecentOrdersList(recent);
    applyPastFilters();
  } catch (error) {
    alert(error.message || "Could not delete order.");
  }
}

function filterByDate(value, sourceOrders = deliveredOrders()) {
  if (!value) {
    renderPastOrdersList(sourceOrders);
    return;
  }
  const filtered = sourceOrders.filter((order) => {
    const t = getOrderTime(order);
    if (!t) return false;
    const d = new Date(t);
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, "0");
    const day = `${d.getDate()}`.padStart(2, "0");
    return `${y}-${m}-${day}` === value;
  });
  renderPastOrdersList(filtered);
}

function filterByMonth(value, sourceOrders = deliveredOrders()) {
  if (!value) {
    renderPastOrdersList(sourceOrders);
    return;
  }
  const filtered = sourceOrders.filter((order) => {
    const t = getOrderTime(order);
    if (!t) return false;
    const d = new Date(t);
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, "0");
    return `${y}-${m}` === value;
  });
  renderPastOrdersList(filtered);
}

refs.productForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(refs.productForm);
  const data = Object.fromEntries(formData.entries());
  const imageFile = formData.get("imageFile");
  if (!imageFile || imageFile.size === 0) {
    alert("Please upload a product image.");
    return;
  }
  let imageDataUrl = "";
  try {
    imageDataUrl = await fileToDataUrl(imageFile);
  } catch {
    alert("Could not process the uploaded image.");
    return;
  }

  try {
    await apiFetch("/products", {
      method: "POST",
      body: JSON.stringify({
        name: data.name.trim(),
        category: data.category,
        unit: data.unit.trim(),
        price: Number(data.price),
        stock: Number(data.stock),
        image: imageDataUrl
      })
    });
    refs.productForm.reset();
    await fetchProducts();
    renderTable();
    setAdminView("inventoryView");
  } catch (error) {
    alert(error.message || "Could not create product.");
  }
});

refs.recentOrdersBtn.addEventListener("click", renderRecentOrders);
refs.filterDateBtn.addEventListener("click", () => filterByDate(refs.filterDateInput.value));
refs.filterMonthBtn.addEventListener("click", () => filterByMonth(refs.filterMonthInput.value));
refs.adminSearchInput.addEventListener("input", renderTable);
refs.adminCategoryFilter.addEventListener("change", renderTable);
refs.adminTabButtons.forEach((btn) => {
  btn.addEventListener("click", () => setAdminView(btn.dataset.adminView));
});

refs.logoutAdmin.addEventListener("click", () => {
  logoutSession().finally(() => {
    window.location.href = "admin-login.html";
  });
});

async function initAdmin() {
  try {
    await fetchProducts();
    await fetchOrders();
    renderTable();
    await renderRecentOrders();
    renderPastOrdersList(deliveredOrders());
    setAdminView("addProductView");
  } catch (error) {
    alert(error.message || "Could not load admin data.");
  }
}

initAdmin();
