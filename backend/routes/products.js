const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// GET all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST a new product
router.post('/', async (req, res) => {
  const product = new Product({
    name: req.body.name,
    image: req.body.image,
    price: req.body.price,
    stock: req.body.stock,
    category: req.body.category,
    description: req.body.description
  });

  try {
    const newProduct = await product.save();
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE a product
router.delete('/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE Price/Stock (Edit)
router.put('/:id', async (req, res) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedProduct);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});
// Delete product by Name
router.delete('/:name', async (req, res) => {
    try {
        await Product.findOneAndDelete({ name: req.params.name });
        res.json({ message: "Deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update product by Name
router.put('/:name', async (req, res) => {
    try {
        const updated = await Product.findOneAndUpdate(
            { name: req.params.name }, 
            req.body, 
            { new: true }
        );
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;