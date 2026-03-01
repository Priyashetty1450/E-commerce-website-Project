const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const jwt = require('jsonwebtoken');
const { calculateTax } = require('../utils/taxCalculator');
const { calculateShipping, determineZone } = require('../utils/shippingCalculator');
const { initiatePayment, processPayment, verifyPayment } = require('../utils/paymentGateway');
const { sendOrderConfirmationEmail, sendOrderConfirmationSMS, sendStatusUpdateEmail, sendRefundConfirmationEmail } = require('../utils/notificationService');

// Middleware to extract userId from JWT token
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Authentication required. Please login.' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.userId = decoded.id;
        req.userEmail = decoded.email || '';
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid token. Please login again.' });
    }
};

// GET all orders
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST Calculate totals (for checkout page)
router.post('/calculate-totals', async (req, res) => {
  try {
    const { items, shippingAddress, shippingMethod, couponCode } = req.body;
    
    // Calculate subtotal
    let subtotal = 0;
    items.forEach(item => {
      subtotal += item.price * item.quantity;
    });

    // Calculate shipping
    const state = shippingAddress?.state || 'KA';
    const zone = determineZone(state);
    const weight = items.length;
    const shippingDetails = calculateShipping(subtotal, weight, zone);
    
    let shippingCharge = shippingDetails.shippingCharge;
    if (shippingMethod === 'express') {
      shippingCharge = shippingCharge * 1.5;
    } else if (shippingMethod === 'overnight') {
      shippingCharge = shippingCharge * 2.5;
    }

    // Calculate tax
    const taxDetails = calculateTax(subtotal);
    const taxAmount = taxDetails.taxAmount;

    // Apply discount
    let discount = 0;
    if (couponCode) {
      if (couponCode.toUpperCase() === 'SAVE10') {
        discount = subtotal * 0.1;
      }
    }

    // Calculate total
    const total = subtotal + shippingCharge + taxAmount - discount;

    res.json({
      subtotal: Math.round(subtotal * 100) / 100,
      shippingCharge: Math.round(shippingCharge * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      total: Math.round(total * 100) / 100,
      shippingDetails: shippingDetails
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST Get shipping rates
router.post('/shipping-rates', async (req, res) => {
  try {
    const { subtotal, weight, state } = req.body;
    const zone = state ? determineZone(state) : 'inter-state';
    const shippingResult = calculateShipping(subtotal, weight || 1, zone);
    
    res.json({
      standard: {
        method: 'standard',
        charge: shippingResult.shippingCharge,
        estimatedDelivery: shippingResult.deliveryEstimate,
        days: shippingResult.deliveryDays
      },
      express: {
        method: 'express',
        charge: Math.round(shippingResult.shippingCharge * 1.5),
        estimatedDelivery: `${Math.max(1, shippingResult.deliveryDays - 1)}-${Math.max(2, shippingResult.deliveryDays)} days`,
        days: Math.max(1, shippingResult.deliveryDays - 1)
      },
      overnight: {
        method: 'overnight',
        charge: Math.round(shippingResult.shippingCharge * 2.5),
        estimatedDelivery: 'Next business day',
        days: 1
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST Checkout - Create new order
router.post('/checkout', async (req, res) => {
  try {
    const { customer, email, phone, items, shippingAddress, shippingMethod, paymentMethod, subtotal, shippingCharge, taxAmount, discount, total } = req.body;

    // Generate unique order ID
    const orderId = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();

    // Determine shipping zone and calculate delivery
    const zone = determineZone(shippingAddress?.state || 'KA');
    const shippingDetails = calculateShipping(subtotal, items.length, zone);
    
    let deliveryDays = shippingDetails.deliveryDays;
    if (shippingMethod === 'express') {
      deliveryDays = Math.max(1, deliveryDays - 2);
    } else if (shippingMethod === 'overnight') {
      deliveryDays = 1;
    }
    
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + deliveryDays);

    // Process payment
    let paymentStatus = 'pending';
    let paymentId = null;
    let transactionId = null;
    
    if (paymentMethod === 'cash_on_delivery') {
      paymentStatus = 'pending';
    } else {
      const paymentResult = await initiatePayment({
        orderId: orderId,
        amount: total,
        customerEmail: email,
        customerPhone: phone,
        paymentMethod: paymentMethod
      });
      
      if (paymentResult.success) {
        paymentId = paymentResult.paymentId;
        const processResult = await processPayment(paymentId, {});
        if (processResult.success) {
          paymentStatus = 'completed';
          transactionId = processResult.transactionId;
        }
      }
    }

    // Create order
    const order = new Order({
      orderId: orderId,
      customer: customer,
      email: email,
      phone: phone,
      items: items.map(item => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image
      })),
      subtotal: subtotal,
      shippingCharge: shippingCharge,
      taxAmount: taxAmount,
      discount: discount || 0,
      total: total,
      status: 'Order Placed',
      paymentStatus: paymentStatus,
      paymentMethod: paymentMethod,
      paymentId: paymentId,
      transactionId: transactionId,
      shippingAddress: shippingAddress,
      shippingMethod: shippingMethod,
      estimatedDelivery: estimatedDelivery,
      statusHistory: [{
        status: 'Order Placed',
        timestamp: new Date(),
        note: paymentMethod === 'cash_on_delivery' ? 'Order placed with Cash on Delivery' : 'Order placed and payment processed'
      }]
    });

    const newOrder = await order.save();

    // Update inventory (reduce stock)
    for (const item of items) {
      if (item.productId) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: -item.quantity }
        });
      }
    }

    // Send confirmation email/SMS
    try {
      await sendOrderConfirmationEmail(newOrder);
      if (phone) {
        await sendOrderConfirmationSMS(newOrder);
      }
    } catch (e) {
      console.log('Notification error:', e.message);
    }

    // Trigger fulfillment
    console.log(`[FULFILLMENT] Order ${orderId} forwarded to warehouse for packing and shipping`);

    res.status(201).json({
      success: true,
      order: newOrder,
      message: 'Order placed successfully'
    });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(400).json({ message: err.message, success: false });
  }
});

// POST a new order (legacy endpoint)
router.post('/', async (req, res) => {
  const order = new Order({
    orderId: req.body.orderId || 'ORD-' + Date.now(),
    customer: req.body.customer,
    email: req.body.email,
    phone: req.body.phone,
    product: req.body.product,
    quantity: req.body.quantity,
    total: req.body.total,
    status: req.body.status || 'Order Placed',
    shippingAddress: req.body.shippingAddress
  });

  try {
    const newOrder = await order.save();
    res.status(201).json(newOrder);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET track order by orderId (public endpoint with email verification)
router.get('/track/:orderId', async (req, res) => {
  try {
    const { email } = req.query;
    const order = await Order.findOne({ orderId: req.params.orderId });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Verify email if provided
    if (email) {
      if (order.email && order.email.toLowerCase() !== email.toLowerCase()) {
        return res.status(404).json({ message: 'Order not found. Please check your order ID and email address.' });
      }
    }
    
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE an order
router.delete('/:id', async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE order status
router.put('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (req.body.status && req.body.status !== order.status) {
      order.statusHistory.push({
        status: req.body.status,
        timestamp: new Date(),
        note: req.body.note || `Status changed to ${req.body.status}`
      });
    }

    if (req.body.status) order.status = req.body.status;
    if (req.body.shippingAddress) order.shippingAddress = req.body.shippingAddress;
    if (req.body.customer) order.customer = req.body.customer;
    if (req.body.email) order.email = req.body.email;
    if (req.body.phone) order.phone = req.body.phone;
    if (req.body.product) order.product = req.body.product;
    if (req.body.quantity) order.quantity = req.body.quantity;
    if (req.body.total) order.total = req.body.total;

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT Update order status (for fulfillment)
router.put('/status/:orderId', async (req, res) => {
  try {
    const { status, note, trackingNumber } = req.body;
    const order = await Order.findOne({ orderId: req.params.orderId });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const validStatuses = ['Order Placed', 'Order Packed', 'Order Shipped', 'Order Out for Delivery', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    order.status = status;
    order.statusHistory.push({
      status,
      timestamp: new Date(),
      note: note || `Status updated to ${status}`
    });

    if (trackingNumber) {
      order.trackingNumber = trackingNumber;
    }

    await order.save();

    try {
      await sendStatusUpdateEmail(order, status);
    } catch (e) {
      console.log('Notification error:', e.message);
    }

    res.json({
      success: true,
      order,
      message: 'Order status updated'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST Request refund
router.post('/:orderId/refund', async (req, res) => {
  try {
    const { refundAmount, reason } = req.body;
    const order = await Order.findOne({ orderId: req.params.orderId });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.paymentStatus !== 'completed') {
      return res.status(400).json({ message: 'Order is not eligible for refund' });
    }

    const refund = refundAmount || order.total;
    
    order.status = 'Refunded';
    order.paymentStatus = 'refunded';
    order.refundAmount = refund;
    order.refundReason = reason;
    order.refundedAt = new Date();
    order.statusHistory.push({
      status: 'Refunded',
      timestamp: new Date(),
      note: reason || `Refund of ₹${refund} processed`
    });

    await order.save();

    try {
      await sendRefundConfirmationEmail(order, refund);
    } catch (e) {
      console.log('Notification error:', e.message);
    }

    res.json({
      success: true,
      order,
      message: 'Refund processed successfully'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT Cancel order
router.put('/cancel/:orderId', async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findOne({ orderId: req.params.orderId });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const cancellableStatuses = ['Order Placed', 'Order Packed'];
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({ message: 'Order cannot be cancelled at this stage' });
    }

    order.status = 'Cancelled';
    order.paymentStatus = 'cancelled';
    order.statusHistory.push({
      status: 'Cancelled',
      timestamp: new Date(),
      note: reason || 'Order cancelled by customer'
    });

    await order.save();

    res.json({
      success: true,
      order,
      message: 'Order cancelled successfully'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
