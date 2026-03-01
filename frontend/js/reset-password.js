const API_BASE = "/api";

// Get token from URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get("token");

const form = document.getElementById("resetForm");

if (!token) {
  showMessage("Invalid reset token", "error");
  form.style.display = "none";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const newPassword = newPassword.value;
  const confirmPassword = confirmPassword.value;

  if (newPassword !== confirmPassword)
    return showMessage("Passwords do not match", "error");

  if (newPassword.length < 6)
    return showMessage("Password must be at least 6 characters", "error");

  try {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword })
    });

    const data = await res.json();

    if (res.ok) {
      showMessage("Password reset successful! Redirecting...", "success");

      setTimeout(() => {
        window.location.href = "/pages/misc/ii.html";
      }, 2000);

    } else {
      showMessage(data.message, "error");
    }

  } catch {
    showMessage("Server error", "error");
  }
});

function showMessage(msg, type) {
  const el = document.getElementById("message");
  el.style.display = "block";
  el.className = `message ${type}`;
  el.textContent = msg;
}