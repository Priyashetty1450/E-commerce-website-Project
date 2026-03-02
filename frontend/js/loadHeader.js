document.addEventListener("DOMContentLoaded", () => {
  loadHeader();
});

/* ================= LOAD HEADER ================= */
function loadHeader() {
  fetch("/components/header.html")
    .then(res => res.text())
    .then(data => {
      document.getElementById("header").innerHTML = data;

      updateNavbar();
      attachLogout();
      updateCartBadge();   // ⭐ NEW
    })
    .catch(err => console.log("Header load error:", err));
}

/* ================= NAVBAR STATE ================= */
function updateNavbar() {
  const token = localStorage.getItem("token");

  const loginBtn = document.getElementById("login-btn");
  const signupBtn = document.getElementById("signup-btn");
  const logoutBtn = document.getElementById("logout-btn");

  if (!loginBtn || !signupBtn || !logoutBtn) return;

  if (token) {
    loginBtn.style.display = "none";
    signupBtn.style.display = "none";
    logoutBtn.style.display = "block";
  } else {
    loginBtn.style.display = "block";
    signupBtn.style.display = "block";
    logoutBtn.style.display = "none";
  }
}

/* ================= LOGOUT ================= */
function attachLogout() {
  const logoutLink = document.querySelector("#logout-link");

  if (!logoutLink) return;

  logoutLink.addEventListener("click", e => {
    e.preventDefault();

    localStorage.removeItem("token");
    localStorage.removeItem("role");

    updateNavbar();
    updateCartBadge(); // reset badge

    window.location.href = "/pages/home/Landing.html";
  });
}

/* ================= CART BADGE (DB BASED) ================= */
async function updateCartBadge() {

  const badge = document.getElementById("cart-count");
  const token = localStorage.getItem("token");

  if (!badge) return;

  // not logged in → 0
  if (!token) {
    badge.innerText = 0;
    return;
  }

  try {
    const res = await fetch("http://localhost:5000/api/cart", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) throw new Error();

    const data = await res.json();

    const count = data.items.reduce((sum, i) => sum + i.quantity, 0);

    badge.innerText = count;

  } catch (err) {
    console.log("Cart badge error", err);
    badge.innerText = 0;
  }
}