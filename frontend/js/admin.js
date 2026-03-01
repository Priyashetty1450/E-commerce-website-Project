let products = JSON.parse(localStorage.getItem("products")) || [];
let orders = [];

const ORDER_STATUSES = [
  "Order Placed",
  "Order Packed",
  "Order Shipped",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
  "Refunded"
];

async function loadOrders() {
  try {
    const res = await fetch("/api/orders");
    orders = await res.json();
    renderOrders();
    updateSummary();
  } catch (err) {
    console.error("Order load error:", err);
  }
}

function updateSummary() {
  document.getElementById("total-products").textContent = products.length;
  document.getElementById("total-orders").textContent = orders.length;
}

function renderProducts() {
  const list = document.getElementById("product-list");
  list.innerHTML = "";

  products.forEach((p, index) => {
    list.innerHTML += `
      <div class="product-card">
        <img src="${p.image}" />
        <h3>${p.name}</h3>
        <p>₹${p.price}</p>
        <button class="btn" onclick="editProduct(${index})">Edit</button>
        <button class="btn" onclick="deleteProduct(${index})">Delete</button>
      </div>
    `;
  });
}

function renderOrders() {
  const tbody = document.querySelector("#order-table tbody");
  tbody.innerHTML = "";

  orders.forEach(order => {
    const options = ORDER_STATUSES.map(
      s => `<option ${order.status === s ? "selected" : ""}>${s}</option>`
    ).join("");

    tbody.innerHTML += `
      <tr>
        <td>${order.orderId}</td>
        <td>${order.customer}</td>
        <td>${order.total}</td>
        <td>
          <select id="status-${order._id}">${options}</select>
        </td>
        <td>
          <button class="btn" onclick="updateOrderStatus('${order._id}')">Update</button>
          <button class="btn" onclick="deleteOrder('${order._id}')">Delete</button>
        </td>
      </tr>
    `;
  });
}

document.getElementById("product-form").addEventListener("submit", async e => {
  e.preventDefault();

  const file = document.getElementById("product-image").files[0];

  const reader = new FileReader();
  reader.onload = async () => {
    const newProduct = {
      name: product-name.value,
      price: product-price.value,
      stock: product-stock.value,
      category: product-category.value,
      description: product-description.value,
      image: reader.result
    };

    products.push(newProduct);
    localStorage.setItem("products", JSON.stringify(products));

    await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newProduct)
    });

    renderProducts();
    updateSummary();
    product-form.reset();
  };

  reader.readAsDataURL(file);
});

async function updateOrderStatus(id) {
  const status = document.getElementById(`status-${id}`).value;

  await fetch(`/api/orders/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });

  loadOrders();
}

async function deleteOrder(id) {
  await fetch(`/api/orders/${id}`, { method: "DELETE" });
  loadOrders();
}

function editProduct(index) {
  const newPrice = prompt("New price");
  products[index].price = newPrice;
  localStorage.setItem("products", JSON.stringify(products));
  renderProducts();
}

function deleteProduct(index) {
  products.splice(index, 1);
  localStorage.setItem("products", JSON.stringify(products));
  renderProducts();
}

renderProducts();
loadOrders();