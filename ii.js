 
        // Mobile Menu Toggle
        document.querySelector('.mobile-menu-btn').addEventListener('click', function() {
            document.querySelector('nav').classList.toggle('active');
        });
        
        // Smooth Scrolling
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                
                document.querySelector(this.getAttribute('href')).scrollIntoView({
                    behavior: 'smooth'
                });
            });
        });
        
        // Simple Cart Functionality
        const cartIcon = document.querySelector('.cart-icon');
        let cartCount = 0;
        
        document.querySelectorAll('.btn').forEach(btn => {
            if(btn.textContent === 'Add to Cart') {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    cartCount++;
                    cartIcon.textContent = `🛒 ${cartCount}`;
                    
                    // Show notification
                    const notification = document.createElement('div');
                    notification.textContent = 'Item added to cart!';
                    notification.style.position = 'fixed';
                    notification.style.bottom = '20px';
                    notification.style.right = '20px';
                    notification.style.backgroundColor = 'var(--primary)';
                    notification.style.color = 'white';
                    notification.style.padding = '10px 20px';
                    notification.style.borderRadius = '4px';
                    notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
                    notification.style.zIndex = '1000';
                    document.body.appendChild(notification);
                    
                    setTimeout(() => {
                        notification.style.opacity = '0';
                        setTimeout(() => {
                            document.body.removeChild(notification);
                        }, 300);
                    }, 2000);
                });
            }
        });
