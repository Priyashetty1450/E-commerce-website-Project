const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');

// POST /api/contact - Submit contact form
router.post('/', async (req, res) => {
    try {
        const { firstName, lastName, email, subject, phone, message } = req.body;

        // Validate required fields
        if (!firstName || !lastName || !email || !subject || !phone || !message) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Create new contact entry
        const contact = new Contact({
            firstName,
            lastName,
            email,
            subject,
            phone,
            message
        });

        // Save to database
        await contact.save();

        res.status(201).json({ message: 'Contact form submitted successfully' });
    } catch (error) {
        console.error('Error saving contact form:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/contact - Get all contact submissions (for admin)
router.get('/', async (req, res) => {
    try {
        const contacts = await Contact.find().sort({ createdAt: -1 });
        res.json(contacts);
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
