  const API_BASE = 'http://localhost:5000/api';
        
        // Order status order for timeline
        const STATUS_ORDER = [
            'Order Placed',
            'Order Packed',
            'Order Shipped',
            'Order Out for Delivery',
            'Delivered'
        ];

        let isLogin = true;

        // Authentication functions
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
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('role', data.role);
                    closeAuthModal();
                    updateUI();
                    if (data.role === 'admin') window.location.href = 'admin.html';
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

        function updateUI() {
            const token = localStorage.getItem('token');
            document.getElementById('login-btn').style.display = token ? 'none' : 'block';
            document.getElementById('logout-btn').style.display = token ? 'block' : 'none';
        }

        function forgotPassword() {
            const email = prompt('Enter your email address:');
            if (email) {
                alert('If an account with that email exists, a reset link has been sent.');
            }
        }

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

        // Track order function
        async function trackOrder() {
            const orderId = document.getElementById('orderIdInput').value.trim();
            const email = document.getElementById('emailInput').value.trim();
            
            if (!orderId) {
                showError('Please enter an order ID.');
                return;
            }
            
            if (!email) {
                showError('Please enter your email address.');
                return;
            }

            try {
                const response = await fetch(`${API_BASE}/orders/track/${orderId}?email=${encodeURIComponent(email)}`);
                const data = await response.json();

                if (response.ok) {
                    displayOrder(data);
                    hideError();
                } else {
                    showError(data.message || 'Order not found. Please check your order ID and email address.');
                }
            } catch (err) {
                showError('Error tracking order. Please try again later.');
                console.error('Error tracking order:', err);
            }
        }

        function showError(message) {
            document.getElementById('errorText').textContent = message;
            document.getElementById('errorMessage').classList.add('active');
            document.getElementById('orderResult').classList.remove('active');
        }

        function hideError() {
            document.getElementById('errorMessage').classList.remove('active');
        }

        function displayOrder(order) {
            // Display order details
            document.getElementById('resultOrderId').textContent = order.orderId;
            document.getElementById('resultCustomer').textContent = order.customer || 'N/A';
            document.getElementById('resultDate').textContent = formatDate(order.createdAt);
            document.getElementById('resultTotal').textContent = `₹${order.total || 0}`;
            document.getElementById('resultProducts').textContent = order.product || 'N/A';
            document.getElementById('resultQuantity').textContent = order.quantity || 0;

            // Display shipping address if available
            if (order.shippingAddress) {
                const address = order.shippingAddress;
                const addressText = [
                    address.street,
                    address.city,
                    address.state,
                    address.zipCode,
                    address.country
                ].filter(part => part).join(', ');
                
                if (addressText) {
                    document.getElementById('resultAddress').textContent = addressText;
                    document.getElementById('shippingAddressSection').style.display = 'block';
                } else {
                    document.getElementById('shippingAddressSection').style.display = 'none';
                }
            } else {
                document.getElementById('shippingAddressSection').style.display = 'none';
            }

            // Display status timeline
            displayStatusTimeline(order);

            // Show the result
            document.getElementById('orderResult').classList.add('active');
        }

        function displayStatusTimeline(order) {
            const timelineContainer = document.getElementById('statusTimeline');
            timelineContainer.innerHTML = '';

            const currentStatus = order.status;
            const statusHistory = order.statusHistory || [];

            // Create timeline based on statusHistory if available, otherwise use current status
            if (statusHistory.length > 0) {
                // Use the actual status history from the order
                statusHistory.forEach((item, index) => {
                    const isLast = index === statusHistory.length - 1;
                    const timelineItem = document.createElement('div');
                    timelineItem.className = `timeline-item ${isLast ? 'active' : 'completed'}`;
                    timelineItem.innerHTML = `
                        <div class="timeline-content">
                            <h4>${item.status}</h4>
                            <p>${item.note || ''}</p>
                            <div class="timestamp">${formatDate(item.timestamp)}</div>
                        </div>
                    `;
                    timelineContainer.appendChild(timelineItem);
                });
            } else {
                // Fallback to current status with default timeline
                const currentIndex = STATUS_ORDER.indexOf(currentStatus);
                
                STATUS_ORDER.forEach((status, index) => {
                    let timelineClass = '';
                    if (index < currentIndex) {
                        timelineClass = 'completed';
                    } else if (index === currentIndex) {
                        timelineClass = 'active';
                    }

                    const timelineItem = document.createElement('div');
                    timelineItem.className = `timeline-item ${timelineClass}`;
                    timelineItem.innerHTML = `
                        <div class="timeline-content">
                            <h4>${status}</h4>
                            <p>${index === currentIndex ? 'Current status' : (index < currentIndex ? 'Completed' : 'Pending')}</p>
                        </div>
                    `;
                    timelineContainer.appendChild(timelineItem);
                });
            }
        }

        function formatDate(dateString) {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        // Allow pressing Enter to track order
        document.getElementById('orderIdInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                trackOrder();
            }
        });

// Initialize
        window.addEventListener('load', () => {
            updateUI();
            
            // Check for order ID in URL
            const urlParams = new URLSearchParams(window.location.search);
            const orderId = urlParams.get('orderId');
            if (orderId) {
                document.getElementById('orderIdInput').value = orderId;
                trackOrder();
            }
        });