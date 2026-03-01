const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, unique: true, sparse: true },
  role: { type: String, default: 'user' }, // 'admin' or 'user'
  // Google OAuth fields
  googleId: { type: String, unique: true, sparse: true },
  isGoogleAuth: { type: Boolean, default: false },
  // Password reset fields
  resetToken: { type: String },
  resetTokenExpiry: { type: Date },
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update timestamp on save - use Mongoose timestamps option instead
userSchema.set('timestamps', true);

module.exports = mongoose.model('User', userSchema);
