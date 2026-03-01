const API_BASE = 'http://localhost:5000/api';
let inventory = [];
let activeItem = null;
let currentFilter = 'all';

// Category display names mapping
const categoryNames = {
    'mural': 'Wall Murals',
    'stage': 'Stage Decor',
    'furniture': 'Furniture'
};

// Load products from database
async function loadProducts() {
    const container = document.getElementById('products-container');
    
    try {
        const response = await fetch(`${API_BASE}/products`);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const dbProducts = await response.json();
        
        // Map DB products to expected format
        inventory = dbProducts.map(p => ({
            id: p._id,
            img: p.image,
            title: p.name,
            price: p.price,
            desc: p.description || '',
            category: p.category,
            stock: p.stock
        }));
        
        renderProducts();
    } catch (err) {
        console.error("Could not load products from database:", err);
        container.innerHTML = '<div class="no-products">Unable to load products. Please try again later.</div>';
    }
}

function renderProducts() {
    const container = document.getElementById('products-container');
    
    if (inventory.length === 0) {
        container.innerHTML = '<div class="no-products">No products available at the moment. Please check back later.</div>';
        return;
    }

    // Filter products based on current filter
    let filteredProducts = inventory;
    if (currentFilter !== 'all') {
        filteredProducts = inventory.filter(p => p.category === currentFilter);
    }

    if (filteredProducts.length === 0) {
        container.innerHTML = '<div class="no-products">No products found in this category.</div>';
        return;
    }

    // Group products by category
    const grouped = {};
    filteredProducts.forEach(p => {
        if (!grouped[p.category]) {
            grouped[p.category] = [];
        }
        grouped[p.category].push(p);
    });

    // Render by category sections
    let html = '';
    for (const [category, products] of Object.entries(grouped)) {
        const categoryDisplayName = categoryNames[category] || category;
        html += `
            <div class="category-section">
                <h2 class="category-title">${categoryDisplayName}</h2>
                <div class="products-grid">
                    ${products.map(p => `
                        <div class="card">
                            <img src="${p.img}" alt="${p.title}" onerror="this.src='placeholder.jpg'">
                            <div class="card-body">
                                <h3>${p.title}</h3>
                                <span class="price">₹${p.price.toLocaleString('en-IN')}</span>
                                <button class="btn-view" onclick="openDetails('${p.id}')">Quick View</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

function filterItems(cat, event) {
    currentFilter = cat;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        // If called programmatically (e.g., from page load), set the first button as active
        document.querySelector('.filter-btn').classList.add('active');
    }
    renderProducts();
}

function openDetails(id) {
    activeItem = inventory.find(p => p.id === id);
    if (!activeItem) return;
    
    document.getElementById('mImg').src = activeItem.img;
    document.getElementById('mTitle').innerText = activeItem.title;
    document.getElementById('mPrice').innerText = "₹" + activeItem.price.toLocaleString('en-IN');
    document.getElementById('mDesc').innerText = activeItem.desc || 'No description available.';
    document.getElementById('mQty').value = 1;
    document.getElementById('pModal').style.display = 'flex';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

async function addToCart() {
    if (!activeItem) return;
    
    const quantity = parseInt(document.getElementById('mQty').value);
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    // Check if item already exists in cart
    const existingItemIndex = cart.findIndex(item => item.id === activeItem.id);
    
    if (existingItemIndex > -1) {
        // Update quantity if item already exists
        cart[existingItemIndex].quantity += quantity;
    } else {
        // Add new item with correct field names
        cart.push({
            id: activeItem.id,
            productId: activeItem.id,
            name: activeItem.title,
            price: activeItem.price,
            image: activeItem.img,
            quantity: quantity
        });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    
    closeModal('pModal');
    alert('Item added to cart!');
}

function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    document.getElementById('cart-count').innerText = cart.length;
}

function openCart() {
    document.getElementById('cModal').style.display = 'flex';
    updateCartDisplay();
}

function updateCartDisplay() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const list = document.getElementById('cart-list');
    let total = 0;

    if (cart.length === 0) {
        list.innerHTML = '<p style="color: #999; text-align: center;">No items in cart.</p>';
    } else {
        list.innerHTML = cart.map((i, idx) => {
            let sub = i.price * i.quantity;
            total += sub;
            return `
                <div class="cart-item">
                    <div>
                        <strong>${i.name}</strong><br>
                        <small>Qty: ${i.quantity}</small>
                    </div>
                    <div style="text-align: right">
                        ₹${sub.toLocaleString('en-IN')}<br>
                        <button class="rm-btn" onclick="removeItem(${idx})">Remove</button>
                    </div>
                </div>
            `;
        }).join('');
    }
    document.getElementById('cart-total').innerText = "₹" + total.toLocaleString('en-IN');
}

function removeItem(idx) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart.splice(idx, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    updateCartDisplay();
}

function sendWhatsApp() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (!cart.length) return alert("Please add items to cart first!");

    let msg = "*Inquiry for Shri Manjunatha Shamiyana Works*%0A%0A";
    let total = 0;
    cart.forEach(i => {
        let sub = i.price * i.quantity;
        total += sub;
        msg += `• ${i.name} (x${i.quantity}): ₹${sub.toLocaleString('en-IN')}%0A`;
    });
    msg += `%0A*Total Amount: ₹${total.toLocaleString('en-IN')}*%0A%0APlease share availability for these items.`;

    window.open(`https://wa.me/919000000000?text=${msg}`, '_blank');
}

// Close modal when clicking outside
window.onclick = function(e) {
    if (e.target.className === 'overlay') {
        e.target.style.display = 'none';
    }
};

// Initialize on page load
window.onload = function() {
    loadProducts();
    updateCartCount();
};