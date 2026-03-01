 const API_BASE = 'http://localhost:5000/api';
    let isLogin = true;
    let allProducts = [];

    // --- Authentication Logic ---
    function showAuthModal(type) {
        isLogin = type === 'login';
        document.getElementById('auth-title').textContent = isLogin ? 'Login' : 'Signup';
        document.getElementById('auth-modal').style.display = 'flex';
    }

    function closeAuthModal() {
        document.getElementById('auth-modal').style.display = 'none';
    }

    function switchForm() {
        isLogin = !isLogin;
        document.getElementById('auth-title').textContent = isLogin ? 'Login' : 'Signup';
    }

    document.getElementById('auth-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const endpoint = isLogin ? '/auth/login' : '/auth/signup';

        try {
            const res = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (res.ok) {
                if (isLogin) {
                    // Only for login: store token and update UI
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('role', data.role);
                    closeAuthModal();
                    updateUI();
                    if (data.role === 'admin') window.location.href = 'admin.html';
                } else {
                    // For signup: just show success and close modal
                    alert(data.message);
                    closeAuthModal();
                }
            } else {
                alert(data.message);
            }
        } catch (err) {
            alert('Error: ' + err.message);
        }
    });

function logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        updateUI();
    }

    // Forgot Password
    async function forgotPassword() {
        const email = prompt('Please enter your registered email:');
        if (!email) return;
        
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            alert('Please enter a valid email address');
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email })
            });
            
            const data = await response.json();
            alert(data.message);
        } catch (err) {
            alert('Error: ' + err.message);
        }
    }

    // Continue with Google
    async function continueWithGoogle() {
        try {
            // Get Google OAuth URL from backend
            const response = await fetch(`${API_BASE}/auth/google`, {
                method: 'GET'
            });
            
            const data = await response.json();
            
            if (data.demoMode) {
                // Demo mode - use demo login
                const email = prompt('Demo Mode: Please enter your email:');
                if (!email) return;
                
                const name = prompt('Demo Mode: Please enter your name (optional):');
                
                const demoResponse = await fetch(`${API_BASE}/auth/google/demo`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, name: name || '' })
                });
                
                const demoData = await demoResponse.json();
                
                if (demoData.success) {
                    localStorage.setItem('token', demoData.token);
                    localStorage.setItem('role', demoData.role);
                    closeAuthModal();
                    updateUI();
                    alert('Successfully logged in with Google (Demo)!');
                } else {
                    alert(demoData.message || 'Demo login failed');
                }
            } else if (data.authUrl) {
                // Real Google OAuth - redirect to Google
                window.location.href = data.authUrl;
            }
        } catch (err) {
            alert('Error initiating Google login. Please try again.');
            console.error(err);
        }
    }

    // Handle Google OAuth callback
    async function handleGoogleCallback(code) {
        try {
            const response = await fetch(`${API_BASE}/auth/google/callback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: code })
            });
            
            const data = await response.json();
            
            if (data.success) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('role', data.role);
                closeAuthModal();
                updateUI();
                alert('Successfully logged in with Google!');
            } else {
                alert(data.message || 'Google login failed');
            }
        } catch (err) {
            alert('Error during Google login');
            console.error(err);
        }
    }

    function updateUI() {
        const token = localStorage.getItem('token');
        document.getElementById('login-btn').style.display = token ? 'none' : 'block';
        document.getElementById('signup-btn').style.display = token ? 'none' : 'block';
        document.getElementById('logout-btn').style.display = token ? 'block' : 'none';
    }

    // --- Product Loading Logic ---

    // 1. Main function to fetch products from MongoDB
    async function loadProducts() {
        try {
            const response = await fetch(`${API_BASE}/products`);
            if (!response.ok) throw new Error('Network response was not ok');

            const productsFromDB = await response.json();

            // If database is empty, it will show a message via renderProducts
            renderProducts(productsFromDB);
            return productsFromDB;
        } catch (err) {
            console.error("Could not load products from MongoDB:", err);
            // Show error message instead of fallback
            renderProducts([]);
            return [];
        }
    }

    // 2. Function to display products in the HTML grid
    function renderProducts(products) {
        const productGrid = document.getElementById('product-grid');
        if (!productGrid) return;

        // Store products globally for cart functionality
        window.currentProducts = products;

        productGrid.innerHTML = '';

        if (products.length === 0) {
            productGrid.innerHTML = '<p style="text-align:center; grid-column: 1/-1; padding: 20px;">No products available at the moment.</p>';
            return;
        }

        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <div class="product-img">
                    <img src="${product.image}" alt="${product.name}" onerror="this.src='placeholder.jpg'">
                    ${product.tag ? `<span class="product-tag">${product.tag}</span>` : ''}
                </div>
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p>${product.description || 'Quality home decor item'}</p>
                    <div class="product-price">₹${product.price}</div>
                    <div class="product-actions">
                        <button class="btn" onclick="addToCart('${product.name}')">Add to Cart</button>
                        <a href="#" class="btn" style="background-color: #333;">View</a>
                    </div>
                </div>
            `;
            productGrid.appendChild(card);
        });
    }

    // --- Cart Logic ---
    
    // Function to add item to cart in database
    async function addToCartAPI(productId, name, price, image, quantity = 1) {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please login or sign up to add products to your cart.');
            return false;
        }

        try {
            const response = await fetch(`${API_BASE}/cart/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    productId: productId,
                    name: name,
                    price: price,
                    image: image,
                    quantity: quantity
                })
            });

            if (response.ok) {
                const data = await response.json();
                // Update cart count from database response
                updateCartCount(data.items ? data.items.length : 0);
                return true;
            } else {
                const error = await response.json();
                alert(error.message || 'Failed to add item to cart');
                return false;
            }
        } catch (err) {
            console.error('Error adding to cart:', err);
            alert('Error adding to cart. Please try again.');
            return false;
        }
    }

    // Function to load cart count from database
    async function loadCartCountFromDB() {
        const token = localStorage.getItem('token');
        if (!token) {
            updateCartCount(0);
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/cart`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                updateCartCount(data.items ? data.items.length : 0);
            } else {
                updateCartCount(0);
            }
        } catch (err) {
            console.error('Error loading cart count:', err);
            updateCartCount(0);
        }
    }

    function updateCartCount(count) {
        // Update cart count in header if element exists
        const cartCountEl = document.querySelector('.cart-icon .cart-count');
        if (cartCountEl) {
            cartCountEl.textContent = count;
        }
    }

    // addToCart function - uses API (which handles database storage)
    function addToCart(productName) {
        // Find the product from current products
        const product = window.currentProducts.find(p => p.name === productName);
        if (!product) {
            alert('Product not found.');
            return;
        }

        // Add to cart using API (which handles database storage)
        addToCartAPI(product._id, product.name, product.price, product.image, 1).then(success => {
            if (success) {
                alert(`Added ${productName} to cart!`);
            }
        });
    }

    // Search functionality
    function performGlobalSearch() {
        const searchInput = document.querySelector('.search-bar input');
        if (!searchInput) return;

        const searchTerm = searchInput.value.toLowerCase().trim();

        if (!window.currentProducts || window.currentProducts.length === 0) {
            // If no products loaded, don't do anything
            return;
        }

        let filteredProducts;
        if (searchTerm === '') {
            // If search term is empty, show all products
            filteredProducts = window.currentProducts;
        } else {
            // Filter products
            filteredProducts = window.currentProducts.filter(product => {
                const name = product.name ? product.name.toLowerCase() : '';
                const description = product.description ? product.description.toLowerCase() : '';
                return name.includes(searchTerm) || description.includes(searchTerm);
            });
        }

        renderProducts(filteredProducts);
    }

    // Run when the page is ready
    window.addEventListener('load', () => {
        updateUI();
        loadProducts();
        loadCartCountFromDB();

        // Add event listeners to search functionality after DOM is loaded
        const searchInput = document.querySelector('.search-bar input');
        const searchButton = document.querySelector('.search-bar button');

        if (searchInput) {
            searchInput.addEventListener('input', performGlobalSearch);
            searchInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    performGlobalSearch();
                }
            });
        }

        if (searchButton) {
            searchButton.addEventListener('click', performGlobalSearch);
        }
    });