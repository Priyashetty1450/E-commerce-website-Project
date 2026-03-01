const API_BASE = "/api";

let isLogin = true;
let cart = JSON.parse(localStorage.getItem("cart")) || [];

/* ================= AUTH UI ================= */

function updateUI() {
  const token = localStorage.getItem("token");

  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");

  if (loginBtn && logoutBtn) {
    loginBtn.style.display = token ? "none" : "block";
    logoutBtn.style.display = token ? "block" : "none";
  }
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  updateUI();
}

/* ================= AUTH MODAL ================= */

function showAuthModal(type) {
  isLogin = type === "login";
  document.getElementById("auth-modal").style.display = "flex";
}

function closeAuthModal() {
  document.getElementById("auth-modal").style.display = "none";
}

function switchForm() {
  isLogin = !isLogin;
  document.getElementById("auth-title").textContent = isLogin
    ? "Login"
    : "Signup";
}

/* ================= LOGIN / SIGNUP ================= */

const authForm = document.getElementById("auth-form");

if (authForm) {
  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const endpoint = isLogin ? "/auth/login" : "/auth/signup";

    try {
      const res = await fetch(API_BASE + endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("role", data.role);

        closeAuthModal();
        updateUI();

        if (data.role === "admin") {
          window.location.href = "/pages/admin/admin.html";
        }
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert("Auth error: " + err.message);
    }
  });
}

/* ================= GOOGLE LOGIN (DEMO SUPPORT) ================= */

async function continueWithGoogle() {
  try {
    const response = await fetch(API_BASE + "/auth/google");
    const data = await response.json();

    if (data.demoMode) {
      const email = prompt("Enter demo email:");
      if (!email) return;

      const name = prompt("Enter name (optional)");

      const demoRes = await fetch(API_BASE + "/auth/google/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });

      const demoData = await demoRes.json();

      if (demoData.success) {
        localStorage.setItem("token", demoData.token);
        localStorage.setItem("role", demoData.role);
        updateUI();
        closeAuthModal();
      }
    } else if (data.authUrl) {
      window.location.href = data.authUrl;
    }
  } catch (err) {
    alert("Google login failed");
  }
}

/* ================= CART RENDER ================= */

function renderCart() {
  const cartContainer = document.getElementById("cart-items");
  const summaryBox = document.getElementById("cart-summary");

  if (!cartContainer) return;

  cartContainer.innerHTML = "";

  if (cart.length === 0) {
    cartContainer.innerHTML = `
      <div class="empty-cart">
        <h2>Your cart is empty</h2>
        <a href="/">Continue Shopping</a>
      </div>`;
    summaryBox.style.display = "none";
    return;
  }

  let totalItems = 0;
  let totalAmount = 0;

  cart.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;

    totalItems += item.quantity;
    totalAmount += itemTotal;

    const cartItem = document.createElement("div");
    cartItem.className = "cart-item";

    cartItem.innerHTML = `
      <img src="${item.image}" alt="${item.name}">

      <div class="cart-item-details">
        <h3>${item.name}</h3>
        <p>₹${item.price}</p>
      </div>

      <div class="cart-item-quantity">
        <button onclick="updateQuantity(${index}, -1)">-</button>
        <input type="number" value="${item.quantity}"
          min="1"
          onchange="changeQuantity(${index}, this.value)">
        <button onclick="updateQuantity(${index}, 1)">+</button>
      </div>

      <div class="cart-item-total">₹${itemTotal}</div>

      <button class="remove-btn"
        onclick="removeFromCart(${index})">Remove</button>
    `;

    cartContainer.appendChild(cartItem);
  });

  document.getElementById("total-items").textContent = totalItems;
  document.getElementById("total-amount").textContent = totalAmount;

  summaryBox.style.display = "block";
}

/* ================= CART ACTIONS ================= */

function updateQuantity(index, change) {
  cart[index].quantity += change;

  if (cart[index].quantity < 1) {
    cart[index].quantity = 1;
  }

  saveCart();
}

function changeQuantity(index, qty) {
  const quantity = parseInt(qty);

  if (quantity > 0) {
    cart[index].quantity = quantity;
    saveCart();
  }
}

function removeFromCart(index) {
  cart.splice(index, 1);
  saveCart();
}

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
  renderCart();
}

/* ================= CHECKOUT ================= */

function goToCheckout() {
  if (cart.length === 0) {
    alert("Your cart is empty");
    return;
  }

  window.location.href = "/pages/checkout/checkout.html";
}

/* ================= INIT ================= */

window.addEventListener("load", () => {
  updateUI();
  renderCart();
});