/* ================= CONFIG ================= */

const API_BASE = "http://localhost:5000/api";

let inventory = [];
let activeItem = null;
let currentFilter = "all";

/* ================= AUTH ================= */

function getToken() {
  return localStorage.getItem("token");
}

function requireLogin() {
  if (!getToken()) {
    showToast("Please login first", "error");

    setTimeout(() => {
      window.location.href = "/pages/auth/login.html";
    }, 1200);

    return false;
  }
  return true;
}

/* ================= TOAST ================= */

function showToast(message, type = "success") {

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerText = message;

  toast.style.position = "fixed";
  toast.style.bottom = "20px";
  toast.style.right = "20px";
  toast.style.background = "#333";
  toast.style.color = "#fff";
  toast.style.padding = "12px 18px";
  toast.style.borderRadius = "8px";
  toast.style.zIndex = "9999";

  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

/* ================= LOADER ================= */

function showLoader() {
  document.getElementById("products-container").innerHTML =
    "<p class='loader'>Loading products...</p>";
}

/* ================= API ================= */

async function apiRequest(url, options = {}) {
  try {

    const res = await fetch(url, options);

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "API Error");
    }

    return await res.json();

  } catch (err) {
    console.error("API ERROR:", err.message);
    showToast(err.message, "error");
    return null;
  }
}

/* ================= LOAD PRODUCTS ================= */

async function loadProducts() {

  showLoader();

  const data = await apiRequest(`${API_BASE}/products`);
  if (!data) return;

  inventory = data.map(p => ({
    id: p._id,
    title: p.name,
    price: p.price,
    img: p.image,
    desc: p.description || "",
    category: p.category || "general",
    stock: p.stock ?? 0
  }));

  renderProducts();
}

/* ================= RENDER PRODUCTS ================= */

function renderProducts() {

  const container = document.getElementById("products-container");

  let filtered = inventory;

  if (currentFilter !== "all") {
    filtered = inventory.filter(p => p.category === currentFilter);
  }

  if (!filtered.length) {
    container.innerHTML = `<p class="no-products">No products found</p>`;
    return;
  }

  container.innerHTML = filtered.map(p => `
    <div class="card">

      <div class="card-img">
        <img src="${p.img}" alt="${p.title}" />
        ${p.stock === 0 ? `<span class="out-of-stock">Out of Stock</span>` : ""}
      </div>

      <div class="card-body">
        <h3>${p.title}</h3>
        <p class="price">₹${p.price}</p>

        <button 
          class="btn-view"
          onclick="openDetails('${p.id}')"
          ${p.stock === 0 ? "disabled" : ""}
        >
          Quick View
        </button>

      </div>

    </div>
  `).join("");
}

/* ================= FILTER ================= */

function filterItems(category, event) {

  currentFilter = category;

  document
    .querySelectorAll(".filter-btn")
    .forEach(btn => btn.classList.remove("active"));

  if (event) event.target.classList.add("active");

  renderProducts();
}

/* ================= OPEN MODAL ================= */

function openDetails(id) {

  activeItem = inventory.find(p => p.id === id);

  if (!activeItem) {
    showToast("Product not found", "error");
    return;
  }

  document.getElementById("mImg").src = activeItem.img;
  document.getElementById("mTitle").innerText = activeItem.title;
  document.getElementById("mPrice").innerText = "₹" + activeItem.price;
  document.getElementById("mDesc").innerText = activeItem.desc;
  document.getElementById("mQty").value = 1;

  document.getElementById("pModal").style.display = "flex";
}

/* ================= CLOSE MODAL ================= */

function closeModal(id) {
  document.getElementById(id).style.display = "none";
}

/* ================= ADD TO CART ================= */

async function addToCart() {

  if (!requireLogin()) return;

  if (!activeItem) {
    showToast("No product selected", "error");
    return;
  }

  const qty = parseInt(document.getElementById("mQty").value);

  if (!qty || qty < 1) {
    showToast("Invalid quantity", "error");
    return;
  }

  if (activeItem.stock && qty > activeItem.stock) {
    showToast("Stock limit reached", "error");
    return;
  }

  const payload = {
    productId: activeItem.id,
    quantity: qty
  };

  const res = await apiRequest(`${API_BASE}/cart/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`
    },
    body: JSON.stringify(payload)
  });

  if (!res) return;

  showToast("Item added to cart");

  updateCartBadge();

  closeModal("pModal");
}

/* ================= CART BADGE ================= */

async function updateCartBadge() {

  const badge = document.getElementById("cart-count");

  if (!badge || !getToken()) return;

  const data = await apiRequest(`${API_BASE}/cart`, {
    headers: { Authorization: `Bearer ${getToken()}` }
  });

  if (!data || !data.items) return;

  const count = data.items.reduce((sum, i) => sum + i.quantity, 0);

  badge.innerText = count;
}

/* ================= AUTO REFRESH BADGE ================= */

setInterval(() => {
  if (getToken()) updateCartBadge();
}, 25000);

/* ================= MODAL OUTSIDE CLICK ================= */

window.addEventListener("click", e => {
  if (e.target.classList.contains("overlay")) {
    e.target.style.display = "none";
  }
});

/* ================= INIT ================= */

window.addEventListener("DOMContentLoaded", () => {
  loadProducts();
  updateCartBadge();
});