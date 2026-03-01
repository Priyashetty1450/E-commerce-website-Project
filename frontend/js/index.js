const API_BASE = "/api";

window.addEventListener("load", () => {
  updateUI();
  loadProducts();
});

/* LOAD PRODUCTS */

async function loadProducts() {

  const container = document.getElementById("product-container");

  try {

    const res = await fetch(API_BASE + "/products");
    const products = await res.json();

    if (!products.length) {
      container.innerHTML = "<h3>No products available</h3>";
      return;
    }

    container.innerHTML = "";

    products.slice(0, 8).forEach(product => {

      container.innerHTML += `
        <div class="product-card">
          <img src="${product.image}" alt="${product.name}">
          <h3>${product.name}</h3>
          <p>₹${product.price}</p>
          <button onclick='addToCart(${JSON.stringify(product)})'>
            Add to Cart
          </button>
        </div>
      `;

    });

  } catch (err) {

    container.innerHTML = "<h3>Failed to load products</h3>";

  }
}

/* ADD TO CART */

function addToCart(product) {

  let cart = JSON.parse(localStorage.getItem("cart")) || [];

  const existing = cart.find(item => item.name === product.name);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  localStorage.setItem("cart", JSON.stringify(cart));

  alert("Added to cart 🛒");
}

/* LOGIN UI */

function updateUI() {

  const token = localStorage.getItem("token");

  document.getElementById("login-btn").style.display =
    token ? "none" : "block";

  document.getElementById("logout-btn").style.display =
    token ? "block" : "none";
}

function logout() {
  localStorage.clear();
  updateUI();
}