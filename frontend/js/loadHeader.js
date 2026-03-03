/* ================= GOOGLE TOKEN HANDLER ================= */
(function handleGoogleToken() {

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  if (token) {
    localStorage.setItem("token", token);

    // Remove token from URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }

})();


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
      updateCartBadge();
      attachSearch();
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
    updateCartBadge();

    window.location.href = "/pages/home/Landing.html";
  });
}


/* ================= SEARCH ================= */
function attachSearch() {

  const searchBtn = document.getElementById("searchBtn");
  const searchInput = document.getElementById("searchInput");

  if (!searchBtn || !searchInput) return;

  function performSearch() {
    const query = searchInput.value.trim();
    if (!query) return;

    window.location.href =
      `/pages/shop/shop.html?search=${encodeURIComponent(query)}`;
  }

  searchBtn.addEventListener("click", performSearch);

  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      performSearch();
    }
  });
}


/* ================= CART BADGE ================= */
async function updateCartBadge() {

  const badge = document.getElementById("cart-count");
  const token = localStorage.getItem("token");

  if (!badge) return;

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