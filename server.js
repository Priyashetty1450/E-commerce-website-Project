

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables FIRST before any other imports
dotenv.config({ path: path.join(__dirname, 'LS.env') });

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products'); // 1. Added this
const orderRoutes = require('./routes/orders'); // Added this
const cartRoutes = require('./routes/cart'); // Added cart routes
const contactRoutes = require('./routes/contact'); // Added contact routes
const paymentRoutes = require('./routes/payment'); // Added payment routes
const item = require('./models/item');
//new

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname)));
// 2. Updated this to handle image data
app.use(bodyParser.json({ limit: '10mb' })); 
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Connect to MongoDB
const mongoURI = process.env.DATABASE_URL || 'mongodb://localhost:27017/ShriManjunathaShamiyana&Events';
mongoose.connect(mongoURI)
  .then(async () => {
    console.log('Connected to: ShriManjunathaShamiyana&Events');

    // Seed admin user
    const User = require('./models/User');
    const bcrypt = require('bcryptjs');
    const adminUsername = 'Narsimha';
    const adminPassword = 'BSN@123';

    try {
      const existingAdmin = await User.findOne({ username: adminUsername });
      if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        const adminUser = new User({
          username: adminUsername,
          password: hashedPassword,
          role: 'admin'
        });
        await adminUser.save();
        console.log('Admin user seeded successfully');
      } else {
        console.log('Admin user already exists');
      }
    } catch (err) {
      console.error('Error seeding admin user:', err);
    }
  })
  .catch(err => console.error('Connection error:', err));

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Routes
app.use('/api/auth', authRoutes);     // Existing (Login/Signup)
app.use('/api/products', productRoutes); // 3. Added this (Products)
app.use('/api/orders', orderRoutes); // Added this (Orders)
app.use('/api/cart', cartRoutes); // Cart routes for storing cart items in database
app.use('/api/contact', contactRoutes); // Contact routes for storing contact form submissions
app.use('/api/payment', paymentRoutes); // Payment routes for Razorpay integration
app.use(express.static('public'));

// Additional routes for new features

 // GET: Fetch all inventory items
app.get('/api/inventory', async (req, res) => {
    try {
        const items = await item.find();
        res.json(items);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST: Add new items (Useful for initial data seeding)
app.post('/api/inventory/seed', async (req, res) => {
    try {
        // req.body should be your inventory array
        await item.insertMany(req.body);
        res.status(201).json({ message: "Inventory Seeded Successfully!" });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


