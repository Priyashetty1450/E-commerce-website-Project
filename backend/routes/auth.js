const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const passport = require('passport');
const User = require('../models/User');
const { sendResetEmail } = require('../utils/emailService');

const router = express.Router();

/* ================= SIGNUP ================= */

router.post('/signup', async (req, res) => {
  const { username, password, email } = req.body;

  try {
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'Username or Email already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      email,
      password: hashedPassword,
      role: 'user'
    });

    await user.save();

    res.status(201).json({
      message: 'User created successfully'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ================= LOGIN ================= */

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (!user)
      return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch)
      return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, role: user.role });

  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

/* ================= GOOGLE LOGIN ================= */

// Step 1: Redirect to Google
router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })
);

// Step 2: Callback
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/pages/auth/login.html'
  }),
  (req, res) => {

    const token = jwt.sign(
      {
        id: req.user._id,
        role: req.user.role,
        email: req.user.email,
        provider: 'google'
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.redirect(`/pages/home/Landing.html?token=${token}`);
  }
);

/* ================= FORGOT PASSWORD ================= */

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    // Don't reveal if user exists
    if (!user) {
      return res.json({
        message: 'If an account with that email exists, a reset link has been sent.'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiry = Date.now() + 3600000; // 1 hour

    user.resetToken = resetToken;
    user.resetTokenExpiry = expiry;

    await user.save();

    const resetLink =
      `${process.env.CLIENT_URL}/pages/auth/reset-password.html?token=${resetToken}`;

    await sendResetEmail(user.email, resetLink);

    res.json({
      message: 'If an account with that email exists, a reset link has been sent.'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ================= RESET PASSWORD ================= */

router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  try {

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired token'
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;

    await user.save();

    res.json({ message: 'Password reset successful' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;