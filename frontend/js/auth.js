const API_URL = "http://localhost:5000/api/auth";

/* ================= MESSAGE ================= */
function showMessage(text, type = "error") {
  const msg = document.getElementById("message");
  if (!msg) return;

  msg.style.display = "block";
  msg.className = `message ${type}`;
  msg.innerText = text;
}

/* ================= CHECK AUTH ================= */
function checkAuth() {
  const token = localStorage.getItem("token");

  if (token) {
    const role = localStorage.getItem("role");

    if (role === "admin") {
      window.location.href = "../../pages/admin/admin.html";
    } else {
      window.location.href = "../../pages/home/Landing.html";
    }
  }
}

/* ================= LOGOUT ================= */
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  window.location.href = "/pages/auth/login.html";
}

/* ================= SIGNUP ================= */
async function signup(e) {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !email || !password) {
    return showMessage("All fields are required");
  }

  try {
    const res = await fetch(`${API_URL}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password })
    });

    const data = await res.json();

    if (res.ok) {
      showMessage("Signup successful → Redirecting to login", "success");

      setTimeout(() => {
        window.location.href = "login.html";
      }, 1500);
    } else {
      showMessage(data.message);
    }
  } catch {
    showMessage("Server error");
  }
}

/* ================= LOGIN ================= */
async function login() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !password) {
    return showMessage("All fields are required");
  }

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);

      showMessage("Login successful", "success");

      setTimeout(() => {
        if (data.role === "admin") {
          window.location.href = "../../pages/admin/admin.html";
        } else {
          window.location.href = "../../pages/home/Landing.html";
        }
      }, 1000);
    } else {
      showMessage(data.message);
    }
  } catch {
    showMessage("Server error");
  }
}

/* ================= GOOGLE LOGIN ================= */
function googleLogin() {
  window.location.href = `${API_URL}/google`;
}

/* ================= RESET PAGE LOGIC ================= */
document.addEventListener("DOMContentLoaded", () => {

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  const emailForm = document.getElementById("emailForm");
  const passwordForm = document.getElementById("passwordForm");
  const pageTitle = document.getElementById("pageTitle");

  if (token && passwordForm && emailForm) {
    pageTitle.innerText = "Set New Password";
    emailForm.style.display = "none";
    passwordForm.style.display = "block";
  }

});

/* ================= SEND RESET LINK ================= */
async function sendResetLink(event) {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();

  if (!email) {
    return showMessage("Enter your email");
  }

  try {
    const res = await fetch(`${API_URL}/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const data = await res.json();
    showMessage(data.message, "success");

  } catch {
    showMessage("Server error");
  }
}

/* ================= RESET PASSWORD ================= */
async function resetPassword(event) {
  event.preventDefault();

  const token = new URLSearchParams(window.location.search).get("token");

  const newPassword = document.getElementById("newPassword").value.trim();
  const confirmPassword = document.getElementById("confirmPassword").value.trim();

  if (!newPassword || !confirmPassword) {
    return showMessage("All fields required");
  }

  if (newPassword !== confirmPassword) {
    return showMessage("Passwords do not match");
  }

  try {
    const res = await fetch(`${API_URL}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword })
    });

    const data = await res.json();

    if (res.ok) {
      showMessage("Password reset successful", "success");

      setTimeout(() => {
        window.location.href = "login.html";
      }, 1500);
    } else {
      showMessage(data.message);
    }

  } catch {
    showMessage("Server error");
  }
}

/* ================= REQUIRE LOGIN ================= */
function requireLogin() {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("Please login first");
    window.location.href = "/pages/auth/login.html";
  }
}

/* ================= REQUIRE ADMIN ================= */
function requireAdmin() {
  const role = localStorage.getItem("role");

  if (role !== "admin") {
    alert("Access denied");
    window.location.href = "/pages/home/Landing.html";
  }
}

/* ================= REQUIRE GUEST ================= */
function requireGuest() {
  const token = localStorage.getItem("token");

  if (token) {
    window.location.href = "/pages/home/Landing.html";
  }
}