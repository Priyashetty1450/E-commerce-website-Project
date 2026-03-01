/*const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');

// Middleware to verify token and get userId
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// GET /api/cart - Get user's cart
router.get('/', authMiddleware, async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.userId }).populate('items.productId');
    if (!cart) {
      // Return empty cart if doesn't exist
      return res.json({ items: [], total: 0 });
    }
    
    // Calculate total
    const total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    res.json({
      items: cart.items,
      total: total
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/cart - Add item to cart
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { productId, name, price, image, quantity = 1 } = req.body;
    
    let cart = await Cart.findOne({ userId: req.userId });
    
    if (!cart) {
      // Create new cart if doesn't exist
      cart = new Cart({ userId: req.userId, items: [] });
    }
    
    // Check if product already in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.productId && item.productId.toString() === productId || item.name === name
    );
    
    if (existingItemIndex > -1) {
      // Update quantity if already exists
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      // Add new item
      cart.items.push({
        productId: productId,
        name: name,
        price: price,
        image: image,
        quantity: quantity
      });
    }
    
    await cart.save();
    
    const total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    res.json({
      items: cart.items,
      total: total,
      message: 'Item added to cart'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/cart/:productId - Update item quantity
router.put('/:productId', authMiddleware, async (req, res) => {
  try {
    const { quantity } = req.body;
    const { productId } = req.params;
    
    const cart = await Cart.findOne({ userId: req.userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }
    
    const itemIndex = cart.items.findIndex(
      item => item.productId && item.productId.toString() === productId
    );
    
    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }
    
    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
    }
    
    await cart.save();
    
    const total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    res.json({
      items: cart.items,
      total: total
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/cart/:productId - Remove item from cart
router.delete('/:productId', authMiddleware, async (req, res) => {
  try {
    const { productId } = req.params;
    
    const cart = await Cart.findOne({ userId: req.userId });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }
    
    cart.items = cart.items.filter(
      item => !(item.productId && item.productId.toString() === productId)
    );
    
    await cart.save();
    
    const total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    res.json({
      items: cart.items,
      total: total
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/cart - Clear cart
router.delete('/', authMiddleware, async (req, res) => {
  try {
    await Cart.findOneAndDelete({ userId: req.userId });
    res.json({ message: 'Cart cleared', items: [], total: 0 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
*/

//new
const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const jwt = require('jsonwebtoken');

// Middleware to extract userId from JWT token
const extractUserId = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Authentication required. Please login.' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.userId = decoded.id;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid token. Please login again.' });
    }
};

// Add item to cart
router.post('/add', extractUserId, async (req, res) => {
    const { productId, name, price, image, quantity } = req.body;
    const userId = req.userId;

    try {
        let cart = await Cart.findOne({ userId });

        if (cart) {
            // Check if product already exists in cart
            const itemIndex = cart.items.findIndex(p => p.productId == productId);

            if (itemIndex > -1) {
                // Update quantity
                cart.items[itemIndex].quantity += quantity;
            } else {
                // Add new item to existing cart
                cart.items.push({ productId, name, price, image, quantity });
            }
            cart.totalBill += (price * quantity);
            cart = await cart.save();
            return res.status(201).send(cart);
        } else {
            // Create a brand new cart
            const newCart = await Cart.create({
                userId,
                items: [{ productId, name, price, image, quantity }],
                totalBill: price * quantity
            });
            return res.status(201).send(newCart);
        }
    } catch (err) {
        res.status(500).send("Something went wrong");
    }
});

module.exports = router;
