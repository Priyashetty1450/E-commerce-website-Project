   const API_BASE = 'http://localhost:5000/api';
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        let currentStep = 1;
        let selectedShippingMethod = 'standard';
        let selectedPaymentMethod = 'cash_on_delivery';
        let orderTotals = {
            subtotal: 0,
            shippingCharge: 0,
            taxAmount: 0,
            discount: 0,
            total: 0
        };
        let shippingRates = null;

        // Razorpay Configuration (will be fetched from backend)
        let RAZORPAY_CONFIG = {
            key: '', // Will be fetched from backend
            currency: 'INR',
            name: 'Shri Manjunatha Shamiyana Works & Events',
            description: 'Order Payment',
            image: 'logo.jpg',
            theme: {
                color: '#8B4513'
            }
        };
        
        // Mock payment tracking
        let isMockPaymentEnabled = false;
        
        // Fetch Razorpay key and payment mode from backend on page load
        async function loadRazorpayKey() {
            try {
                // Load payment mode
                const modeResponse = await fetch(`${API_BASE}/payment/mode`);
                const modeData = await modeResponse.json();
                if (modeData.success) {
                    isMockPaymentEnabled = modeData.isMockPayment;
                    console.log('Mock payment enabled:', isMockPaymentEnabled);
                    
                    // Show mock payment option if enabled
                    if (isMockPaymentEnabled) {
                        const mockOption = document.getElementById('mockPaymentOption');
                        if (mockOption) {
                            mockOption.style.display = 'block';
                        }
                    }
                }
                
                // Load Razorpay key
                const response = await fetch(`${API_BASE}/payment/key`);
                const data = await response.json();
                if (data.success) {
                    RAZORPAY_CONFIG.key = data.key;
                }
            } catch (err) {
                console.error('Error loading Razorpay key:', err);
            }
        }

// Initialize
        window.addEventListener('load', async () => {
            // Allow guest checkout - no login required
            
            if (cart.length === 0) {
                alert('Your cart is empty!');
                window.location.href = 'cart.html';
                return;
            }
            renderOrderSummary();
            updateUI();
            loadUserData();
            await loadRazorpayKey(); // Load Razorpay key from backend
        });

        function loadUserData() {
            const token = localStorage.getItem('token');
            if (token) {
                document.getElementById('guestNotice').style.display = 'none';
            }
        }

        function updateUI() {
            const token = localStorage.getItem('token');
            document.getElementById('login-btn').style.display = token ? 'none' : 'block';
            document.getElementById('logout-btn').style.display = token ? 'block' : 'none';
        }

        // Render order summary
        function renderOrderSummary() {
            const container = document.getElementById('summaryItems');
            container.innerHTML = '';
            
            let subtotal = 0;
            
            cart.forEach(item => {
                const itemTotal = item.price * item.quantity;
                subtotal += itemTotal;
                
                const itemDiv = document.createElement('div');
                itemDiv.className = 'summary-item';
                itemDiv.innerHTML = `
                    <img src="${item.image}" alt="${item.name}">
                    <div class="summary-item-details">
                        <h4>${item.name}</h4>
                        <p>Qty: ${item.quantity} × ₹${item.price}</p>
                    </div>
                    <div>₹${itemTotal}</div>
                `;
                container.appendChild(itemDiv);
            });

            orderTotals.subtotal = subtotal;
            updateTotals();
        }

        // Calculate totals
        async function updateTotals() {
            const state = document.getElementById('state').value || 'default';
            
            try {
                const response = await fetch(`${API_BASE}/orders/calculate-totals`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        items: cart,
                        shippingAddress: { state: state },
                        shippingMethod: selectedShippingMethod,
                        couponCode: document.getElementById('couponCode').value
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    orderTotals = {
                        subtotal: data.subtotal,
                        shippingCharge: data.shippingCharge,
                        taxAmount: data.taxAmount,
                        discount: data.discount,
                        total: data.total
                    };
                    shippingRates = data.shippingDetails;
                }
            } catch (err) {
                console.error('Error calculating totals:', err);
            }

            // Update UI
            document.getElementById('summarySubtotal').textContent = `₹${orderTotals.subtotal}`;
            document.getElementById('summaryShipping').textContent = orderTotals.shippingCharge === 0 ? 'Free' : `₹${orderTotals.shippingCharge}`;
            document.getElementById('summaryTax').textContent = `₹${orderTotals.taxAmount}`;
            document.getElementById('summaryTotal').textContent = `₹${orderTotals.total}`;
            
            if (orderTotals.discount > 0) {
                document.getElementById('discountRow').style.display = 'flex';
                document.getElementById('summaryDiscount').textContent = `-₹${orderTotals.discount}`;
            } else {
                document.getElementById('discountRow').style.display = 'none';
            }
        }

        // Apply coupon
        async function applyCoupon() {
            const code = document.getElementById('couponCode').value;
            if (!code) {
                alert('Please enter a coupon code');
                return;
            }
            await updateTotals();
            if (orderTotals.discount > 0) {
                alert('Coupon applied successfully!');
            } else {
                alert('Invalid coupon code');
            }
        }

        // Update shipping when state changes
        async function updateShipping() {
            await updateTotals();
        }

        // Shipping method selection
        function selectShippingMethod(element, method) {
            document.querySelectorAll('.shipping-option').forEach(opt => opt.classList.remove('selected'));
            element.classList.add('selected');
            selectedShippingMethod = method;
            updateTotals();
        }

        // Payment method selection
        function selectPaymentMethod(element) {
            document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('selected'));
            element.classList.add('selected');
            selectedPaymentMethod = element.dataset.method;
            
            // Show/hide payment details
            document.getElementById('cardDetails').style.display = selectedPaymentMethod === 'card' ? 'block' : 'none';
            document.getElementById('upiDetails').style.display = selectedPaymentMethod === 'upi' ? 'block' : 'none';
        }

        // Navigation
        function goToPayment() {
            // Validate shipping info
            const fullName = document.getElementById('fullName').value;
            const phone = document.getElementById('phone').value;
            const email = document.getElementById('email').value;
            const street = document.getElementById('street').value;
            const city = document.getElementById('city').value;
            const state = document.getElementById('state').value;
            const zipCode = document.getElementById('zipCode').value;

            if (!fullName || !phone || !email || !street || !city || !state || !zipCode) {
                alert('Please fill in all required fields');
                return;
            }

            // Validate email
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                alert('Please enter a valid email address');
                return;
            }

            document.getElementById('shippingSection').style.display = 'none';
            document.getElementById('paymentSection').style.display = 'block';
            document.getElementById('reviewSection').style.display = 'none';
            
            document.getElementById('step1').classList.remove('active');
            document.getElementById('step1').classList.add('completed');
            document.getElementById('step2').classList.add('active');
        }

        function goToShipping() {
            document.getElementById('shippingSection').style.display = 'block';
            document.getElementById('paymentSection').style.display = 'none';
            document.getElementById('reviewSection').style.display = 'none';
            
            document.getElementById('step2').classList.remove('active');
            document.getElementById('step1').classList.remove('completed');
            document.getElementById('step1').classList.add('active');
        }

        function goToReview() {
            // Validate payment details if needed
            if (selectedPaymentMethod === 'card') {
                const cardNumber = document.getElementById('cardNumber').value;
                if (!cardNumber) {
                    alert('Please enter card details');
                    return;
                }
            }
            if (selectedPaymentMethod === 'upi') {
                const upiId = document.getElementById('upiId').value;
                if (!upiId) {
                    alert('Please enter UPI ID');
                    return;
                }
            }

            // Update review section
            const fullName = document.getElementById('fullName').value;
            const street = document.getElementById('street').value;
            const landmark = document.getElementById('landmark').value;
            const city = document.getElementById('city').value;
            const state = document.getElementById('state').value;
            const zipCode = document.getElementById('zipCode').value;
            
            document.getElementById('reviewAddress').innerHTML = `
                ${fullName}<br>
                ${street}${landmark ? ', ' + landmark : ''}<br>
                ${city}, ${state} - ${zipCode}
            `;

            const paymentMethods = {
                'cash_on_delivery': 'Cash on Delivery',
                'card': 'Credit/Debit Card',
                'upi': 'UPI',
                'paypal': 'PayPal',
                'mock_payment': 'Test Payment (Mock)'
            };
            document.getElementById('reviewPayment').textContent = paymentMethods[selectedPaymentMethod];
            
            const shippingMethods = {
                'standard': 'Standard Shipping (5-7 days)',
                'express': 'Express Shipping (2-3 days)',
                'overnight': 'Overnight Delivery (1 day)'
            };
            document.getElementById('reviewShipping').textContent = shippingMethods[selectedShippingMethod] || 'Standard Shipping';

            document.getElementById('shippingSection').style.display = 'none';
            document.getElementById('paymentSection').style.display = 'none';
            document.getElementById('reviewSection').style.display = 'block';
            
            document.getElementById('step2').classList.remove('active');
            document.getElementById('step2').classList.add('completed');
            document.getElementById('step3').classList.add('active');
        }

        // Razorpay Payment Handler - Creates order on backend first
        async function initiateRazorpayPayment() {
            const fullName = document.getElementById('fullName').value;
            const phone = document.getElementById('phone').value;
            const email = document.getElementById('email').value;
            const amount = orderTotals.total;

            // Show loading
            document.getElementById('loadingOverlay').classList.add('active');

            try {
                // Step 1: Create order on backend (this is the key fix!)
                const orderResponse = await fetch(`${API_BASE}/payment/create-order`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        amount: amount,
                        currency: 'INR',
                        receipt: 'order_' + Date.now()
                    })
                });

                const orderData = await orderResponse.json();
                
                if (!orderData.success) {
                    throw new Error(orderData.message || 'Failed to create payment order');
                }

                // Step 2: Now open Razorpay with the order_id from backend
                const options = {
                    key: RAZORPAY_CONFIG.key,
                    amount: amount * 100, // Amount in paisa
                    currency: 'INR',
                    name: RAZORPAY_CONFIG.name,
                    description: RAZORPAY_CONFIG.description,
                    image: RAZORPAY_CONFIG.image,
                    theme: RAZORPAY_CONFIG.theme,
                    order_id: orderData.orderId, // Use order_id from backend!
                    prefill: {
                        name: fullName,
                        email: email,
                        contact: phone
                    },
                    handler: function(response) {
                        // Payment successful - verify with backend
                        handlePaymentSuccess(response, orderData.orderId);
                    },
                    modal: {
                        ondismiss: function() {
                            // Payment cancelled
                            document.getElementById('loadingOverlay').classList.remove('active');
                            handlePaymentFailure({ error: { description: 'Payment cancelled by user' } });
                        }
                    }
                };

                const rzp = new Razorpay(options);
                rzp.open();
                
                // Hide loading when Razorpay opens
                document.getElementById('loadingOverlay').classList.remove('active');
                
            } catch (error) {
                document.getElementById('loadingOverlay').classList.remove('active');
                console.error('Error creating order:', error);
                alert('Failed to initiate payment. Please try again.');
            }
        }

        // Handle successful payment
        async function handlePaymentSuccess(response) {
            const fullName = document.getElementById('fullName').value;
            const phone = document.getElementById('phone').value;
            const email = document.getElementById('email').value;

            const shippingAddress = {
                street: document.getElementById('street').value,
                landmark: document.getElementById('landmark').value,
                city: document.getElementById('city').value,
                state: document.getElementById('state').value,
                zipCode: document.getElementById('zipCode').value,
                country: 'India'
            };

            const orderData = {
                customer: fullName,
                email: email,
                phone: phone,
                items: cart,
                shippingAddress: shippingAddress,
                shippingMethod: selectedShippingMethod,
                paymentMethod: 'razorpay',
                paymentId: response.razorpay_payment_id,
                subtotal: orderTotals.subtotal,
                shippingCharge: orderTotals.shippingCharge,
                taxAmount: orderTotals.taxAmount,
                discount: orderTotals.discount,
                total: orderTotals.total
            };

            try {
                const apiResponse = await fetch(`${API_BASE}/orders/checkout`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orderData)
                });

                const data = await apiResponse.json();

                if (apiResponse.ok && data.success) {
                    // Clear cart
                    localStorage.setItem('cart', JSON.stringify([]));

                    // Redirect to success page
                    const orderId = data.order.orderId;
                    const transactionId = response.razorpay_payment_id;
                    const amount = orderTotals.total;
                    window.location.href = `success.html?orderId=${orderId}&transactionId=${transactionId}&amount=${amount}`;
                } else {
                    alert('Payment successful but order creation failed. Please contact support.');
                }
            } catch (err) {
                console.error('Error creating order:', err);
                alert('Payment successful but order creation failed. Please contact support.');
            }
        }

        // Handle failed payment
        function handlePaymentFailure(error) {
            const amount = orderTotals.total;
            const errorCode = error.error.code || 'PAYMENT_FAILED';
            const errorDescription = error.error.description || 'Transaction was declined by the payment gateway';

            // Redirect to failure page
            window.location.href = `failure.html?amount=${amount}&errorCode=${encodeURIComponent(errorCode)}&errorDescription=${encodeURIComponent(errorDescription)}`;
        }

        // Place order (now triggers Razorpay payment or mock payment)
        async function placeOrder() {
            // Validate all required fields before proceeding to payment
            const fullName = document.getElementById('fullName').value;
            const phone = document.getElementById('phone').value;
            const email = document.getElementById('email').value;
            const street = document.getElementById('street').value;
            const city = document.getElementById('city').value;
            const state = document.getElementById('state').value;
            const zipCode = document.getElementById('zipCode').value;

            if (!fullName || !phone || !email || !street || !city || !state || !zipCode) {
                alert('Please fill in all required fields');
                return;
            }

            // Validate email
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                alert('Please enter a valid email address');
                return;
            }

            // Check if this is a mock payment or test payment
            if (selectedPaymentMethod === 'mock_payment' || isMockPaymentEnabled) {
                // Handle mock payment
                await processMockPayment();
            } else {
                // Initiate Razorpay payment
                initiateRazorpayPayment();
            }
        }

        // Process mock payment (simulates successful payment without Razorpay)
        async function processMockPayment() {
            // Show loading
            document.getElementById('loadingOverlay').classList.add('active');

            const fullName = document.getElementById('fullName').value;
            const phone = document.getElementById('phone').value;
            const email = document.getElementById('email').value;

            const shippingAddress = {
                street: document.getElementById('street').value,
                landmark: document.getElementById('landmark').value,
                city: document.getElementById('city').value,
                state: document.getElementById('state').value,
                zipCode: document.getElementById('zipCode').value,
                country: 'India'
            };

            try {
                // Step 1: Create a mock order on backend
                const orderResponse = await fetch(`${API_BASE}/payment/create-order`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        amount: orderTotals.total,
                        currency: 'INR',
                        receipt: 'order_' + Date.now()
                    })
                });

                const orderData = await orderResponse.json();
                
                if (!orderData.success) {
                    throw new Error(orderData.message || 'Failed to create payment order');
                }

                console.log('Mock order created:', orderData);

                // Step 2: Verify mock payment on backend
                const verifyResponse = await fetch(`${API_BASE}/payment/verify-payment`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        razorpay_order_id: orderData.orderId,
                        razorpay_payment_id: 'mock_pay_' + Date.now(),
                        razorpay_signature: 'mock_signature_' + Date.now(),
                        isMock: true
                    })
                });

                const verifyData = await verifyResponse.json();
                
                if (!verifyData.success) {
                    throw new Error(verifyData.message || 'Payment verification failed');
                }

                console.log('Mock payment verified:', verifyData);

                // Step 3: Create order in database
                const orderDataDb = {
                    customer: fullName,
                    email: email,
                    phone: phone,
                    items: cart,
                    shippingAddress: shippingAddress,
                    shippingMethod: selectedShippingMethod,
                    paymentMethod: 'mock_payment',
                    paymentId: verifyData.paymentId || 'mock_pay_' + Date.now(),
                    subtotal: orderTotals.subtotal,
                    shippingCharge: orderTotals.shippingCharge,
                    taxAmount: orderTotals.taxAmount,
                    discount: orderTotals.discount,
                    total: orderTotals.total
                };

                const apiResponse = await fetch(`${API_BASE}/orders/checkout`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orderDataDb)
                });

                const data = await apiResponse.json();

                // Hide loading
                document.getElementById('loadingOverlay').classList.remove('active');

                if (apiResponse.ok && data.success) {
                    // Clear cart
                    localStorage.setItem('cart', JSON.stringify([]));

                    // Redirect to success page
                    const orderId = data.order.orderId;
                    const transactionId = verifyData.paymentId || 'MOCK-' + Date.now();
                    const amount = orderTotals.total;
                    window.location.href = `success.html?orderId=${orderId}&transactionId=${transactionId}&amount=${amount}`;
                } else {
                    alert('Order creation failed. Please try again.');
                }
            } catch (error) {
                document.getElementById('loadingOverlay').classList.remove('active');
                console.error('Error processing mock payment:', error);
                alert('Payment failed. Please try again.');
            }
        }

        // Auth functions
        function showAuthModal() {
            document.getElementById('auth-modal').classList.add('active');
        }

        function closeAuthModal() {
            document.getElementById('auth-modal').classList.remove('active');
        }

        let isLogin = true;
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