/* ================= CONFIG ================= */

const API_BASE = "http://localhost:5000/api";

const state = {
  cart: [],
  totals: null,
  shippingMethod: "standard",
  paymentMethod: "cash_on_delivery",
  razorpayKey: null,
  isMockPayment: false,
  isPlacingOrder: false
};

/* ================= DOM ================= */

const $ = id => document.getElementById(id);

/* ================= AUTH ================= */

const getToken = () => localStorage.getItem("token");

function requireAuth() {
  if (!getToken()) {
    window.location.href = "/pages/auth/login.html";
    throw new Error("Not authenticated");
  }
}

/* ================= SAFE TEXT SETTER ================= */

function setText(id, value) {
  const el = $(id);
  if (el) el.innerText = value;
}

/* ================= TOAST ================= */

function showToast(msg) {
  alert(msg);
}

/* ================= LOADER ================= */

function setLoading(show) {
  $("loadingOverlay")?.classList.toggle("active", show);
}

/* ================= API CLIENT ================= */

async function api(url, options = {}) {

  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...options.headers
    },
    ...options
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "API Error");
  }

  return res.json();
}

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", init);

async function init() {

  try {

    requireAuth();

    setLoading(true);

    await Promise.all([
      loadPaymentConfig(),
      loadCart()
    ]);

    renderSummary();

    await calculateTotals();

  } catch (err) {
    showToast(err.message);
  }
  finally {
    setLoading(false);
  }
}

/* ================= LOAD PAYMENT CONFIG ================= */

async function loadPaymentConfig() {

  const key = await fetch(`${API_BASE}/payment/key`).then(r => r.json());
  const mode = await fetch(`${API_BASE}/payment/mode`).then(r => r.json());

  state.razorpayKey = key.key;
  state.isMockPayment = mode.isMockPayment;
}

/* ================= LOAD CART ================= */

async function loadCart() {

  const data = await api("/cart");

  state.cart = data.items || [];

  if (!state.cart.length) {
    window.location.href = "/pages/cart/cart.html";
  }
}

/* ================= RENDER SUMMARY ================= */

function renderSummary() {

  const container = $("summaryItems");
  container.innerHTML = "";

  state.cart.forEach(item => {

    const total = item.price * item.quantity;

    container.innerHTML += `
      <div class="summary-item">
        <img src="${item.image}">
        <div>
          <h4>${item.name}</h4>
          <p>Qty: ${item.quantity}</p>
        </div>
        <div>₹${total}</div>
      </div>
    `;
  });
}

/* ================= CALCULATE TOTALS ================= */

async function calculateTotals() {

  const items = state.cart.map(item => ({
    productId: item.productId?._id || item.productId,
    quantity: item.quantity,
    price: item.price
  }));

  state.totals = await api("/orders/calculate-totals", {
    method: "POST",
    body: JSON.stringify({
      items,
      shippingMethod: state.shippingMethod
    })
  });

  setText("summarySubtotal", state.totals.subtotal);

  setText(
    "summaryShipping",
    state.totals.shippingCharge
      ? `₹${state.totals.shippingCharge}`
      : "Free"
  );

  setText("summaryTax", state.totals.taxAmount);

  setText("summaryTotal", state.totals.total);
}

/* ================= SHIPPING VALIDATION ================= */

function getShippingData() {

  const data = {
    fullName: $("fullName").value.trim(),
    phone: $("phone").value.trim(),
    email: $("email").value.trim(),
    street: $("street").value.trim(),
    city: $("city").value.trim(),
    state: $("state").value.trim(),
    zipCode: $("zipCode").value.trim()
  };

  if (Object.values(data).some(v => !v)) {
    throw new Error("All fields required");
  }

  return data;
}

/* ================= CONTINUE TO PAYMENT ================= */

function goToPayment() {

  try {

    getShippingData();

    $("paymentSection").style.display = "block";

    window.scrollTo({
      top: $("paymentSection").offsetTop - 100,
      behavior: "smooth"
    });

  } catch (err) {
    showToast(err.message);
  }
}

/* ================= PAYMENT METHOD ================= */

function selectPaymentMethod(el) {

  document.querySelectorAll(".payment-option")
    .forEach(i => i.classList.remove("selected"));

  el.classList.add("selected");

  state.paymentMethod = el.dataset.method;
}

/* ================= PLACE ORDER ================= */

async function placeOrder() {

  if (state.isPlacingOrder) return;

  try {

    state.isPlacingOrder = true;

    const shipping = getShippingData();

    if (!state.totals?.total) {
      throw new Error("Invalid order amount");
    }

    if (state.paymentMethod === "razorpay" && !state.isMockPayment) {
      return startRazorpay(shipping);
    }

    await createOrder(shipping, "cash_on_delivery");

  }
  catch (err) {
    showToast(err.message);
  }
  finally {
    state.isPlacingOrder = false;
  }
}

/* ================= RAZORPAY ================= */

async function startRazorpay(shipping) {

  setLoading(true);

  const order = await api("/payment/create-order", {
    method: "POST",
    body: JSON.stringify({ amount: state.totals.total })
  });

  setLoading(false);

  const rzp = new Razorpay({
    key: state.razorpayKey,
    amount: state.totals.total * 100,
    order_id: order.orderId,

    handler: res => {
      createOrder(shipping, "razorpay", res.razorpay_payment_id);
    }
  });

  rzp.open();
}

/* ================= CREATE ORDER ================= */

async function createOrder(shipping, method, paymentId = null) {

  setLoading(true);

  const data = await api("/orders/checkout", {
    method: "POST",
    body: JSON.stringify({
      customer: shipping.fullName,
      email: shipping.email,
      phone: shipping.phone,
      items: state.cart,
      shippingAddress: shipping,
      paymentMethod: method,
      paymentId,
      ...state.totals
    })
  });

  setLoading(false);

  if (data.success) {

window.location.href =
`${window.location.origin}/pages/checkout/success.html?orderId=${data.order.orderId}`;

  } else {
    throw new Error("Order failed");
  }
}