/**
 * Order Management System (OMS)
 * Handles inventory management, order processing, and fulfillment
 */

const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');

// Order status workflow
const ORDER_WORKFLOW = [
    'Order Placed',
    'Order Packed',
    'Order Shipped',
    'Order Out for Delivery',
    'Delivered'
];

/**
 * Generate unique order ID
 * @returns {string} - Unique order ID
 */
function generateOrderId() {
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substr(2, 9).toUpperCase();
    return `ORD-${timestamp}-${randomPart}`;
}

/**
 * Generate tracking number
 * @returns {string} - Tracking number
 */
function generateTrackingNumber() {
    return `TRK${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}

/**
 * Process checkout - Create order with inventory management
 * @param {object} checkoutData - Complete checkout data
 * @returns {Promise<object>} - Created order or error
 */
async function processCheckout(checkoutData) {
    const {
        customer,
        email,
        phone,
        items,
        shippingAddress,
        shippingMethod,
        paymentMethod,
        subtotal,
        shippingCharge,
        taxAmount,
        discount = 0,
        total
    } = checkoutData;

    try {
        // Check inventory for all items first
        for (const item of items) {
            // Try to find product by name
            const products = await Product.find({ 
                name: { $regex: new RegExp(item.name || item.product, 'i') } 
            });
            
            if (products.length > 0) {
                const product = products[0];
                const availableStock = product.quantity || product.stock || 0;
                
                if (availableStock < item.quantity) {
                    throw new Error(`Insufficient stock for ${item.name || item.product}. Available: ${availableStock}`);
                }
            }
        }

        // Reduce stock for each item
        for (const item of items) {
            const products = await Product.find({ 
                name: { $regex: new RegExp(item.name || item.product, 'i') } 
            });
            
            if (products.length > 0) {
                const product = products[0];
                const currentStock = product.quantity || product.stock || 0;
                product.quantity = currentStock - item.quantity;
                if (product.stock !== undefined) {
                    product.stock = product.quantity;
                }
                await product.save();
            }
        }

        // Calculate estimated delivery date
        let estimatedDeliveryDays;
        switch (shippingMethod) {
            case 'express':
                estimatedDeliveryDays = 2;
                break;
            case 'overnight':
                estimatedDeliveryDays = 1;
                break;
            case 'international':
                estimatedDeliveryDays = 7 + Math.floor(Math.random() * 5);
                break;
            case 'standard':
            default:
                estimatedDeliveryDays = 3 + Math.floor(Math.random() * 3);
                break;
        }

        const estimatedDelivery = new Date();
        estimatedDelivery.setDate(estimatedDelivery.getDate() + estimatedDeliveryDays);

        // Create order
        const order = new Order({
            orderId: generateOrderId(),
            customer,
            email,
            phone,
            product: items.map(i => i.name || i.product).join(', '),
            quantity: items.reduce((sum, i) => sum + i.quantity, 0),
            total,
            subtotal,
            shippingCharge,
            taxAmount,
            discount,
            status: 'Order Placed',
            shippingAddress,
            shippingMethod,
            paymentMethod,
            items: items.map(item => ({
                productId: item._id || null,
                name: item.name || item.product,
                price: item.price,
                quantity: item.quantity,
                image: item.image
            })),
            estimatedDelivery: estimatedDelivery.toISOString(),
            statusHistory: [{
                status: 'Order Placed',
                timestamp: new Date(),
                note: 'Order placed successfully'
            }]
        });

        const createdOrder = await order.save();

        return {
            success: true,
            order: createdOrder,
            message: 'Order placed successfully'
        };

    } catch (error) {
        console.error('Checkout error:', error.message);
        throw error;
    }
}

/**
 * Update order status in the workflow
 * @param {string} orderId - Order ID
 * @param {string} newStatus - New status
 * @param {string} note - Optional note
 * @returns {Promise<object>} - Updated order
 */
async function updateOrderStatus(orderId, newStatus, note = '') {
    try {
        const order = await Order.findOne({ orderId });
        
        if (!order) {
            throw new Error('Order not found');
        }

        const currentIndex = ORDER_WORKFLOW.indexOf(order.status);
        const newIndex = ORDER_WORKFLOW.indexOf(newStatus);

        if (newIndex < currentIndex) {
            throw new Error('Cannot revert to previous status');
        }

        order.status = newStatus;
        order.statusHistory.push({
            status: newStatus,
            timestamp: new Date(),
            note: note || `Status changed to ${newStatus}`
        });

        // Add tracking number when shipped
        if (newStatus === 'Order Shipped' && !order.trackingNumber) {
            order.trackingNumber = generateTrackingNumber();
        }

        await order.save();

        return {
            success: true,
            order,
            message: `Order status updated to ${newStatus}`
        };

    } catch (error) {
        console.error('Status update error:', error.message);
        throw error;
    }
}

/**
 * Process fulfillment - Move to next status
 * @param {string} orderId - Order ID
 * @returns {Promise<object>} - Updated order
 */
async function processFulfillment(orderId) {
    try {
        const order = await Order.findOne({ orderId });
        
        if (!order) {
            throw new Error('Order not found');
        }

        const currentIndex = ORDER_WORKFLOW.indexOf(order.status);
        
        if (currentIndex === ORDER_WORKFLOW.length - 1) {
            return {
                success: false,
                message: 'Order already delivered'
            };
        }

        const nextStatus = ORDER_WORKFLOW[currentIndex + 1];
        order.status = nextStatus;
        order.statusHistory.push({
            status: nextStatus,
            timestamp: new Date(),
            note: `Order ${nextStatus.toLowerCase()}`
        });

        if (nextStatus === 'Order Shipped') {
            order.trackingNumber = generateTrackingNumber();
        }

        await order.save();

        return {
            success: true,
            order,
            message: `Order ${nextStatus.toLowerCase()}`
        };

    } catch (error) {
        console.error('Fulfillment error:', error.message);
        throw error;
    }
}

/**
 * Get order by ID
 * @param {string} orderId - Order ID
 * @returns {Promise<object>} - Order details
 */
async function getOrderById(orderId) {
    try {
        const order = await Order.findOne({ orderId });
        
        if (!order) {
            throw new Error('Order not found');
        }

        return order;

    } catch (error) {
        console.error('Get order error:', error.message);
        throw error;
    }
}

/**
 * Get all orders for a customer
 * @param {string} email - Customer email
 * @returns {Promise<array>} - Customer orders
 */
async function getCustomerOrders(email) {
    try {
        const orders = await Order.find({ email }).sort({ createdAt: -1 });
        return orders;

    } catch (error) {
        console.error('Get customer orders error:', error.message);
        throw error;
    }
}

/**
 * Get all orders (for admin)
 * @param {object} filters - Optional filters
 * @returns {Promise<array>} - All orders
 */
async function getAllOrders(filters = {}) {
    try {
        const orders = await Order.find(filters).sort({ createdAt: -1 });
        return orders;

    } catch (error) {
        console.error('Get all orders error:', error.message);
        throw error;
    }
}

module.exports = {
    generateOrderId,
    generateTrackingNumber,
    processCheckout,
    updateOrderStatus,
    processFulfillment,
    getOrderById,
    getCustomerOrders,
    getAllOrders,
    ORDER_WORKFLOW
};
