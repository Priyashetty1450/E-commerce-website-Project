const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },

  password: {
    type: String,
    required: function () {
      return !this.isGoogleAuth;   // password not required for Google users
    }
  },

  email: { type: String, unique: true, sparse: true },

  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },

  // 🔐 Google OAuth
  googleId: { type: String, unique: true, sparse: true },
  isGoogleAuth: { type: Boolean, default: false },

  // 🔁 Password reset
  resetToken: String,
  resetTokenExpiry: Date

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);