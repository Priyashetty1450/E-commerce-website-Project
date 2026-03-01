const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "LS.env") });

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const morgan = require("morgan");

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

app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

/* ================= SERVE FRONTEND ================= */

const frontendPath = path.join(__dirname, "../frontend");
app.use(express.static(frontendPath));

/* ================= DATABASE ================= */

mongoose.set("strictQuery", false);

mongoose.connect(process.env.DATABASE_URL)
.then(async () => {
  console.log("✅ MongoDB Connected");

  const existingAdmin = await User.findOne({
    username: process.env.ADMIN_USER
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASS, 10);

    await User.create({
      username: process.env.ADMIN_USER,
      password: hashedPassword,
      role: "admin",
    });

    console.log("✅ Admin user created");
  }
})
.catch((err) => {
  console.error("❌ MongoDB Error:", err);
  process.exit(1);
});

/* ================= API ROUTES ================= */

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/payment", paymentRoutes);

/* ================= INVENTORY ================= */

app.get("/api/inventory", async (req, res) => {
  const items = await Item.find();
  res.json(items);
});

/* ================= HEALTH ================= */

app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

/* ================= CLEAN PAGE ROUTES ================= */

app.get("/", (req, res) =>
  res.sendFile(path.join(frontendPath, "pages/home/Landing.html"))
);

app.get("/shop", (req, res) =>
  res.sendFile(path.join(frontendPath, "pages/shop/shop.html"))
);

app.get("/collection", (req, res) =>
  res.sendFile(path.join(frontendPath, "pages/shop/collection.html"))
);

app.get("/cart", (req, res) =>
  res.sendFile(path.join(frontendPath, "pages/cart/cart.html"))
);

app.get("/checkout", (req, res) =>
  res.sendFile(path.join(frontendPath, "pages/checkout/checkout.html"))
);

app.get("/contact", (req, res) =>
  res.sendFile(path.join(frontendPath, "pages/contact/Contact-us.html"))
);

app.get("/help", (req, res) =>
  res.sendFile(path.join(frontendPath, "pages/contact/help.html"))
);

app.get("/about", (req, res) =>
  res.sendFile(path.join(frontendPath, "pages/info/About.html"))
);

app.get("/service", (req, res) =>
  res.sendFile(path.join(frontendPath, "pages/info/Service.html"))
);

app.get("/track-order", (req, res) =>
  res.sendFile(path.join(frontendPath, "pages/orders/track-order.html"))
);

app.get("/admin", (req, res) =>
  res.sendFile(path.join(frontendPath, "pages/admin/admin.html"))
);

/* ================= 404 ================= */

app.use((req, res) => {
  res.status(404).send("❌ Page not found");
});

/* ================= START SERVER ================= */

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});