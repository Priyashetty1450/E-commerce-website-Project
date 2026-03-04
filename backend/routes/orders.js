const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const jwt = require('jsonwebtoken');

const { calculateTax } = require('../utils/taxCalculator');
const { calculateShipping, determineZone } = require('../utils/shippingCalculator');
const { initiatePayment, processPayment } = require('../utils/paymentGateway');
const {
  sendOrderConfirmationEmail,
  sendOrderConfirmationSMS,
  sendStatusUpdateEmail,
  sendRefundConfirmationEmail
} = require('../utils/notificationService');


// ================= AUTH MIDDLEWARE =================
const authMiddleware = (req, res, next) => {

  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Login required' });
  }

  try {

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    );

    req.userId = decoded.id;
    req.userEmail = decoded.email || '';

    next();

  } catch {

    return res.status(401).json({ message: 'Invalid token' });

  }

};


// ================= GET ALL ORDERS (ADMIN) =================
router.get('/', async (req, res) => {

  try {

    const orders = await Order.find().sort({ createdAt: -1 });

    res.json(orders);

  } catch (err) {

    res.status(500).json({ message: "Failed to fetch orders" });

  }

});


// ================= CALCULATE TOTALS =================
router.post('/calculate-totals', async (req, res) => {

  const { items, shippingAddress, shippingMethod, couponCode } = req.body;

  let subtotal = 0;

  items.forEach(i => subtotal += i.price * i.quantity);

  const zone = determineZone(shippingAddress?.state || 'KA');

  const shippingData = calculateShipping(subtotal, items.length, zone);

  let shippingCharge = shippingData.shippingCharge;

  if (shippingMethod === 'express') shippingCharge *= 1.5;
  if (shippingMethod === 'overnight') shippingCharge *= 2.5;

  const tax = calculateTax(subtotal).taxAmount;

  let discount = 0;

  if (couponCode === 'SAVE10') {
    discount = subtotal * 0.1;
  }

  const total = subtotal + shippingCharge + tax - discount;

  res.json({
    subtotal,
    shippingCharge,
    taxAmount: tax,
    discount,
    total
  });

});


// ================= CHECKOUT =================
router.post('/checkout', authMiddleware, async (req, res) => {

  try {

    const cart = await Cart.findOne({ userId: req.userId });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    const {
      customer,
      email,
      phone,
      shippingAddress,
      shippingMethod,
      paymentMethod
    } = req.body;

    const items = cart.items;

    let subtotal = cart.totalBill;

    const zone = determineZone(shippingAddress?.state || 'KA');

    const shippingData = calculateShipping(subtotal, items.length, zone);

    const tax = calculateTax(subtotal).taxAmount;

    const total = subtotal + shippingData.shippingCharge + tax;

    const orderId = 'ORD-' + Date.now();

    let paymentStatus = 'pending';
    let paymentId = null;
    let transactionId = null;

    if (paymentMethod !== 'cash_on_delivery') {

      const payment = await initiatePayment({
        orderId,
        amount: total
      });

      paymentId = payment.paymentId;

      const result = await processPayment(paymentId, {});

      if (result.success) {

        paymentStatus = 'completed';
        transactionId = result.transactionId;

      }

    }

    const order = new Order({

      orderId,
      customer,
      email,
      phone,
      items,
      subtotal,
      shippingCharge: shippingData.shippingCharge,
      taxAmount: tax,
      total,
      paymentMethod,
      paymentStatus,
      paymentId,
      transactionId,
      shippingAddress,
      shippingMethod,
      status: "Pending",
      statusHistory: [{
        status: "Pending",
        timestamp: new Date()
      }]

    });

    const savedOrder = await order.save();


    // ================= REDUCE STOCK =================
    for (const item of items) {

      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: -item.quantity } }
      );

    }


    // ================= CLEAR CART =================
    await Cart.findOneAndDelete({ userId: req.userId });


    // ================= SEND NOTIFICATIONS =================
    await sendOrderConfirmationEmail(savedOrder);

    if (phone) {
      await sendOrderConfirmationSMS(savedOrder);
    }

    res.status(201).json({
      success: true,
      order: savedOrder
    });

  } catch (err) {

    console.error(err);

    res.status(400).json({
      message: err.message,
      success: false
    });

  }

});


// ================= TRACK ORDER =================
router.get('/track/:orderId', async (req, res) => {

  try {

    const order = await Order.findOne({
      orderId: req.params.orderId
    });

    if (!order) {

      return res.status(404).json({
        message: "Order not found"
      });

    }

    res.json(order);

  } catch (err) {

    res.status(500).json({
      message: "Server error"
    });

  }

});


// ================= UPDATE ORDER STATUS (ADMIN) =================
router.put('/status/:orderId', async (req, res) => {

  try {

    const { status, note } = req.body;

    const order = await Order.findOne({
      orderId: req.params.orderId
    });

    if (!order) {

      return res.status(404).json({
        message: "Order not found"
      });

    }

    order.status = status;

    if (!order.statusHistory) {
      order.statusHistory = [];
    }

    order.statusHistory.push({

      status,
      note: note || "",
      timestamp: new Date()

    });

    await order.save();

    await sendStatusUpdateEmail(order, status);

    res.json({
      success: true,
      message: "Order status updated",
      order
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });

  }

});


// ================= DELETE ORDER =================
router.delete('/:id', async (req, res) => {

  try {

    await Order.findByIdAndDelete(req.params.id);

    res.json({
      message: "Order deleted"
    });

  } catch {

    res.status(500).json({
      message: "Delete failed"
    });

  }

});


// ================= CANCEL ORDER =================
router.put('/cancel/:orderId', async (req, res) => {

  const order = await Order.findOne({
    orderId: req.params.orderId
  });

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  order.status = "Cancelled";
  order.paymentStatus = "cancelled";

  await order.save();

  res.json({
    success: true,
    order
  });

});


// ================= REFUND =================
router.post('/:orderId/refund', async (req, res) => {

  const order = await Order.findOne({
    orderId: req.params.orderId
  });

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  order.status = "Refunded";
  order.paymentStatus = "refunded";

  await order.save();

  await sendRefundConfirmationEmail(order, order.total);

  res.json({
    success: true,
    order
  });

});

module.exports = router;