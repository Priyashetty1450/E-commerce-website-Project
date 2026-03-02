const API_BASE = "http://localhost:5000/api";

const STATUS_ORDER = [
  "Order Placed",
  "Order Packed",
  "Order Shipped",
  "Order Out for Delivery",
  "Delivered"
];

let pollingInterval = null;

/* ================= HELPERS ================= */

const $ = (id) => document.getElementById(id);

function getToken() {
  return localStorage.getItem("token");
}

function formatDate(dateString) {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

/* ================= UI STATES ================= */

function showLoader() {
  $("orderResult").classList.remove("active");
  $("errorMessage").classList.remove("active");
}

function showError(msg) {
  $("errorText").innerText = msg;
  $("errorMessage").classList.add("active");
}

function hideError() {
  $("errorMessage").classList.remove("active");
}

/* ================= TRACK ORDER ================= */

async function trackOrder() {
  const orderId = $("orderIdInput").value.trim();
  const email = $("emailInput").value.trim();

  if (!orderId) return showError("Enter Order ID");

  showLoader();

  try {
    let url = `${API_BASE}/orders/track/${orderId}`;

    if (!getToken()) {
      if (!email) return showError("Enter your email");
      url += `?email=${encodeURIComponent(email)}`;
    }

    const res = await fetch(url, {
      headers: getToken()
        ? { Authorization: `Bearer ${getToken()}` }
        : {}
    });

    const data = await res.json();

    if (!res.ok) {
      return showError(data.message || "Order not found");
    }

    hideError();
    renderOrder(data);
    startLiveTracking(orderId, email);

  } catch {
    showError("Server error. Try again.");
  }
}

/* ================= RENDER ORDER ================= */

function renderOrder(order) {
  $("orderResult").classList.add("active");

  $("resultOrderId").innerText = order.orderId;
  $("resultCustomer").innerText = order.customer || "N/A";
  $("resultDate").innerText = formatDate(order.createdAt);
  $("resultTotal").innerText = `₹${order.total || 0}`;

  /* PRODUCTS */
  if (order.items?.length) {
    $("resultProducts").innerText = order.items.map(i => i.name).join(", ");
    $("resultQuantity").innerText =
      order.items.reduce((sum, i) => sum + i.quantity, 0);
  } else {
    $("resultProducts").innerText = order.product || "N/A";
    $("resultQuantity").innerText = order.quantity || 0;
  }

  /* ADDRESS */
  if (order.shippingAddress) {
    const a = order.shippingAddress;
    $("resultAddress").innerText =
      `${a.street || ""}, ${a.city || ""}, ${a.state || ""} - ${a.zipCode || ""}`;

    $("shippingAddressSection").style.display = "block";
  }

  renderTimeline(order);
}

/* ================= TIMELINE ================= */

function renderTimeline(order) {
  const container = $("statusTimeline");
  container.innerHTML = "";

  const history = order.statusHistory || [];
  const currentStatus = order.status;

  if (history.length) {
    history.forEach((s, i) => {
      const div = document.createElement("div");

      div.className =
        "timeline-item " +
        (i === history.length - 1 ? "active" : "completed");

      div.innerHTML = `
        <div class="timeline-content">
          <h4>${s.status}</h4>
          <p>${s.note || ""}</p>
          <span>${formatDate(s.timestamp)}</span>
        </div>
      `;

      container.appendChild(div);
    });

  } else {
    const currentIndex = STATUS_ORDER.indexOf(currentStatus);

    STATUS_ORDER.forEach((status, i) => {
      const div = document.createElement("div");

      let cls = "";
      if (i < currentIndex) cls = "completed";
      if (i === currentIndex) cls = "active";

      div.className = `timeline-item ${cls}`;

      div.innerHTML = `
        <div class="timeline-content">
          <h4>${status}</h4>
        </div>
      `;

      container.appendChild(div);
    });
  }
}

/* ================= LIVE TRACKING ================= */

function startLiveTracking(orderId, email) {
  if (pollingInterval) clearInterval(pollingInterval);

  pollingInterval = setInterval(() => {
    silentRefresh(orderId, email);
  }, 15000);
}

async function silentRefresh(orderId, email) {
  try {
    let url = `${API_BASE}/orders/track/${orderId}`;

    if (!getToken()) {
      url += `?email=${encodeURIComponent(email)}`;
    }

    const res = await fetch(url);
    const data = await res.json();

    if (res.ok) {
      renderTimeline(data);
    }
  } catch {}
}

/* ================= ENTER KEY ================= */

$("orderIdInput")?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") trackOrder();
});

/* ================= INIT ================= */

window.addEventListener("load", () => {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("orderId");

  if (orderId) {
    $("orderIdInput").value = orderId;
    trackOrder();
  }
});