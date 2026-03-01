const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

const router = express.Router();

// In-memory store for reset tokens (in production, use Redis or database)
const passwordResetTokens = new Map();

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'your-google-client-id';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback';

// Signup
router.post('/signup', async (req, res) => {
  const { username, password, email } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ 
      username, 
      password: hashedPassword,
      email: email || `${username}@example.com`
    });
    await user.save();

    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'your_secret_key', { expiresIn: '1h' });
    res.json({ token, role: user.role });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Forgot Password - Request Reset
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists
      return res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour

    // Store token
    passwordResetTokens.set(resetToken, {
      userId: user._id,
      email: user.email,
      expiry: resetTokenExpiry
    });

    // In production, send email with reset link
    const resetLink = `http://localhost:5500/reset-password.html?token=${resetToken}`;
    console.log(`[EMAIL] Password reset link: ${resetLink}`);
    console.log(`[EMAIL] To: ${user.email}`);
    
    // Simulate sending email
    res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset Password - Verify Token and Update
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    const tokenData = passwordResetTokens.get(token);
    
    if (!tokenData) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    if (Date.now() > tokenData.expiry) {
      passwordResetTokens.delete(token);
      return res.status(400).json({ message: 'Reset token has expired' });
    }

    // Find user and update password
    const user = await User.findById(tokenData.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    // Delete used token
    passwordResetTokens.delete(token);

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Google OAuth - Initiation
router.get('/google', (req, res) => {
  // Check if we're in demo mode (no real Google credentials)
  if (GOOGLE_CLIENT_ID === 'your-google-client-id') {
    // Return demo mode flag - frontend will show a demo login form
    return res.json({ 
      demoMode: true,
      message: 'Google OAuth is in demo mode. Use test credentials.'
    });
  }
  
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent('email profile')}&` +
    `access_type=offline`;
  
  res.json({ authUrl: googleAuthUrl });
});

// Demo Google Login (for testing without real Google credentials)
router.post('/google/demo', async (req, res) => {
  const { email, name } = req.body;
  
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }
  
  try {
    // Check if user exists
    let user = await User.findOne({ email: email });
    
    if (!user) {
      // Create new user with demo Google info
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      
      user = new User({
        username: name || email.split('@')[0],
        email: email,
        password: hashedPassword,
        role: 'user',
        googleId: 'demo_' + Date.now(),
        isGoogleAuth: true
      });
      await user.save();
    }
    
    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      token: token,
      role: user.role,
      message: 'Google login successful'
    });
  } catch (err) {
    console.error('Demo Google login error:', err);
    res.status(500).json({ message: 'Authentication failed' });
  }
});

// Google OAuth - Callback
router.post('/google/callback', async (req, res) => {
  const { code } = req.body;
  
  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: GOOGLE_REDIRECT_URI
      })
    });

    const tokens = await tokenResponse.json();

    if (!tokens.access_token) {
      return res.status(400).json({ message: 'Failed to obtain access token' });
    }

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });

    const googleUser = await userInfoResponse.json();

    if (!googleUser.email) {
      return res.status(400).json({ message: 'Failed to get user email from Google' });
    }

    // Check if user exists
    let user = await User.findOne({ email: googleUser.email });

    if (!user) {
      // Create new user with Google info
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      
      user = new User({
        username: googleUser.name || googleUser.email.split('@')[0],
        email: googleUser.email,
        password: hashedPassword,
        role: 'user',
        googleId: googleUser.id,
        isGoogleAuth: true
      });
      await user.save();
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token: token,
      role: user.role,
      message: 'Google login successful'
    });
  } catch (err) {
    console.error('Google OAuth error:', err);
    res.status(500).json({ message: 'Google authentication failed' });
  }
});

module.exports = router;
