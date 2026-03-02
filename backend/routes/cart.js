const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const jwt = require('jsonwebtoken');


/* ================= AUTH MIDDLEWARE ================= */

const extractUserId = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    );

    req.userId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
};


/* ================= GET USER CART ================= */

router.get('/', extractUserId, async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.userId })
      .populate('items.productId');

    if (!cart) {
      return res.json({
        items: [],
        totalBill: 0
      });
    }

    res.json(cart);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


/* ================= ADD ITEM TO CART ================= */

router.post('/add', extractUserId, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    // 🔥 FETCH REAL PRODUCT FROM DB
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    let cart = await Cart.findOne({ userId: req.userId });

    if (!cart) {
      cart = new Cart({
        userId: req.userId,
        items: [],
        totalBill: 0
      });
    }

    const itemIndex = cart.items.findIndex(
      item => item.productId.toString() === productId
    );

    if (itemIndex > -1) {

      // 🔁 IF ITEM EXISTS → INCREASE QUANTITY
      cart.items[itemIndex].quantity += quantity;

    } else {

      // 🆕 ADD NEW ITEM
      cart.items.push({
        productId,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity
      });

    }

    // 💰 SAFE TOTAL CALCULATION
    cart.totalBill = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    await cart.save();

    res.status(201).json(cart);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


/* ================= UPDATE ITEM QUANTITY ================= */

router.put('/:productId', extractUserId, async (req, res) => {
  try {
    const { quantity } = req.body;
    const { productId } = req.params;

    const cart = await Cart.findOne({ userId: req.userId });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(
      item => item.productId.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
    }

    cart.totalBill = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    await cart.save();

    res.json(cart);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


/* ================= REMOVE ITEM FROM CART ================= */

router.delete('/:productId', extractUserId, async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.userId });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.items = cart.items.filter(
      item => item.productId.toString() !== req.params.productId
    );

    cart.totalBill = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    await cart.save();

    res.json(cart);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


/* ================= CLEAR CART ================= */

router.delete('/', extractUserId, async (req, res) => {
  try {
    await Cart.findOneAndDelete({ userId: req.userId });

    res.json({
      message: 'Cart cleared',
      items: [],
      totalBill: 0
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


module.exports = router;