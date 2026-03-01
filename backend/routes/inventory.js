const express = require('express');
const router = express.Router();
const item = require('../models/item'); // Import the Schema

// 1. GET ALL ITEMS
// URL: http://localhost:5000/api/inventory
router.get('/', async (req, res) => {
    try {
        const items = await item.find();
        res.json(items);
    } catch (err) {
        res.status(500).json({ message: "Error fetching inventory" });
    }
});

// 2. GET SINGLE ITEM BY ID
// URL: http://localhost:5000/api/inventory/1
router.get('/:id', async (req, res) => {
    try {
        const item = await item.findOne({ id: req.params.id });
        if (!item) return res.status(404).json({ message: "Item not found" });
        res.json(item);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;