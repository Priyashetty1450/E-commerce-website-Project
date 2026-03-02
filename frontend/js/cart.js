const API_BASE = "http://localhost:5000/api";
let cartData = null;

/* ================= AUTH TOKEN ================= */
function getToken() {
  return localStorage.getItem("token");
}

/* ================= TOAST ================= */
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerText = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

/* ================= LOADER ================= */
function showLoader() {
  document.getElementById("cart-items").innerHTML = "<p>Loading cart...</p>";
}

/* ================= FETCH CART ================= */
async function fetchCart() {
  if (!getToken()) return;

  try {
    showLoader();

    const res = await fetch(`${API_BASE}/cart`, {
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    });

    if (!res.ok) throw new Error();

    const data = await res.json();

    cartData = data;

    renderCart();
    updateCartBadge();

  } catch (err) {
    console.log(err);
    showToast("Failed to load cart", "error");
  }
}

/* ================= RENDER CART ================= */
function renderCart() {
  const container = document.getElementById("cart-items");
  const summary = document.getElementById("cart-summary");
  const empty = document.getElementById("empty-cart");

  if (!container) return;

  container.innerHTML = "";

  if (!cartData || !cartData.items || cartData.items.length === 0) {
    empty.style.display = "block";
    summary.style.display = "none";
    return;
  }

  empty.style.display = "none";

  let totalItems = 0;
  let totalAmount = 0;

  cartData.items.forEach(item => {

    const product = item.productId || {};

    const productId = product._id || item.productId;

    const stock = product.stock ?? "N/A";

    const itemTotal = item.price * item.quantity;

    totalItems += item.quantity;
    totalAmount += itemTotal;

    const div = document.createElement("div");
    div.className = "cart-item";

    div.innerHTML = `
      <img src="${item.image}" />

      <div class="cart-details">
        <h3>${item.name}</h3>
        <p>₹${item.price}</p>
        <p class="stock">Stock: ${stock}</p>
      </div>

      <div class="cart-qty">
        <button onclick="changeQty('${productId}', -1)">-</button>
        <span>${item.quantity}</span>
        <button onclick="changeQty('${productId}', 1)">+</button>
      </div>

      <div class="cart-total">
        ₹${itemTotal}
      </div>

      <button class="remove-btn" onclick="removeItem('${productId}')">
        <i class="fa fa-trash"></i>
      </button>
    `;

    container.appendChild(div);
  });

  document.getElementById("total-items").innerText = totalItems;
  document.getElementById("total-amount").innerText = totalAmount;

  summary.style.display = "block";
}

/* ================= CHANGE QTY ================= */
async function changeQty(productId, delta) {

  const item = cartData.items.find(i =>
    (i.productId._id || i.productId) === productId
  );

  if (!item) return;

  const newQty = item.quantity + delta;

  if (newQty < 1) return;

  const stock = item.productId?.stock;

  if (stock && newQty > stock) {
    showToast("Stock limit reached", "error");
    return;
  }

  try {
    await fetch(`${API_BASE}/cart/${productId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({ quantity: newQty })
    });

    fetchCart();

  } catch {
    showToast("Update failed", "error");
  }
}

/* ================= REMOVE ITEM ================= */
async function removeItem(productId) {
  try {
    await fetch(`${API_BASE}/cart/${productId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    });

    showToast("Item removed");
    fetchCart();

  } catch {
    showToast("Remove failed", "error");
  }
}

/* ================= CLEAR CART ================= */
async function clearCart() {
  if (!confirm("Clear cart?")) return;

  await fetch(`${API_BASE}/cart`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${getToken()}`
    }
  });

  fetchCart();
}

/* ================= CHECKOUT ================= */
function goToCheckout() {
  if (!cartData || cartData.items.length === 0) {
    showToast("Cart is empty", "error");
    return;
  }

  window.location.href = "/pages/checkout/checkout.html";
}

/* ================= BADGE UPDATE ================= */
function updateCartBadge() {

  const badge = document.getElementById("cart-count");

  if (!badge || !cartData) return;

  const count = cartData.items.reduce((sum, i) => sum + i.quantity, 0);

  badge.innerText = count;
}

/* ================= AUTO REFRESH ================= */
setInterval(() => {
  if (getToken()) fetchCart();
}, 30000);

/* ================= INIT ================= */
window.addEventListener("DOMContentLoaded", fetchCart);