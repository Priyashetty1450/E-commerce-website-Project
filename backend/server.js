const dotenv = require("dotenv");
const path = require("path");

/* LOAD ENV FIRST */
dotenv.config({ path: path.join(__dirname, "LS.env") });

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");

/* ROUTES */
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");
const cartRoutes = require("./routes/cart");
const contactRoutes = require("./routes/contact");
const paymentRoutes = require("./routes/payment");

const Item = require("./models/item");
const User = require("./models/User");

const app = express();
const PORT = process.env.PORT || 5000;

/* ================= MIDDLEWARE ================= */

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* ================= SERVE FRONTEND ================= */

app.use(express.static(path.join(__dirname, "../frontend")));

/* ================= DATABASE ================= */

const mongoURI =
  process.env.DATABASE_URL ||
  "mongodb://127.0.0.1:27017/ShriManjunathaShamiyanaEvents";

mongoose
  .connect(mongoURI)
  .then(async () => {
    console.log("✅ MongoDB Connected");

    /* SEED ADMIN */
    const adminUsername = "Narsimha";
    const adminPassword = "BSN@123";

    const existingAdmin = await User.findOne({ username: adminUsername });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      await User.create({
        username: adminUsername,
        password: hashedPassword,
        role: "admin",
      });

      console.log("✅ Admin user created");
    } else {
      console.log("ℹ️ Admin already exists");
    }
  })
  .catch((err) => console.error("❌ MongoDB Error:", err));

/* ================= API ROUTES ================= */

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/payment", paymentRoutes);

/* ================= INVENTORY ================= */

app.get("/api/inventory", async (req, res) => {
  try {
    const items = await Item.find();
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/inventory/seed", async (req, res) => {
  try {
    await Item.insertMany(req.body);
    res.status(201).json({ message: "Inventory seeded successfully!" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/* ================= HEALTH ================= */

app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

/* ================= HOME ROUTE ================= */

app.get("/", (req, res) => {
  res.sendFile(
    path.join(__dirname, "../frontend/pages/home/Landing.html")
  );
});

/* ================= HANDLE ALL OTHER ROUTES ================= */
/* (Express 5 safe – no '*' crash) */

app.use((req, res) => {
  res.sendFile(
    path.join(__dirname, "../frontend/pages/home/Landing.html")
  );
});

/* ================= START SERVER ================= */

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});