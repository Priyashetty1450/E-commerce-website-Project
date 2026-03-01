const mongoose = require('mongoose');

// Predefined order statuses
const ORDER_STATUSES = [
  'Order Placed',
  'Order Packed',
  'Order Shipped',
  'Order Out for Delivery',
  'Delivered',
  'Cancelled',
  'Refunded'
];

// Payment methods
const PAYMENT_METHODS = [
  'card',
  'debit_card',
  'credit_card',
  'upi',
  'paypal',
  'cash_on_delivery',
  'netbanking'
];

// Payment status
const PAYMENT_STATUS = [
  'pending',
  'processing',
  'completed',
  'failed',
  'refunded',
  'cancelled'
];

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  customer: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  product: { type: String },
  quantity: { type: Number },
  total: { type: Number, required: true },
  
  // New fields for full checkout
  subtotal: { type: Number },
  shippingCharge: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  
  // Items array for cart products
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    image: { type: String }
  }],
  
  status: { 
    type: String, 
    default: 'Order Placed',
    enum: ORDER_STATUSES
  },
  
  // Shipping details
  shippingAddress: {
    street: { type: String },
    landmark: { type: String },
    city: { type: String },
    state: { type: String },
    zipCode: { type: String },
    country: { type: String, default: 'India' }
  },
  shippingMethod: { 
    type: String,
    enum: ['standard', 'express', 'overnight', 'international'],
    default: 'standard'
  },
  estimatedDelivery: { type: Date },
  trackingNumber: { type: String },
  
  // Payment details
  paymentMethod: { 
    type: String,
    enum: PAYMENT_METHODS,
    default: 'cash_on_delivery'
  },
  paymentStatus: { 
    type: String,
    enum: PAYMENT_STATUS,
    default: 'pending'
  },
  paymentId: { type: String },
  transactionId: { type: String },
  paidAt: { type: Date },
  
  // Order notes
  customerNote: { type: String },
  adminNote: { type: String },
  
  // Status history
  statusHistory: [
    {
      status: { type: String },
      timestamp: { type: Date, default: Date.now },
      note: { type: String }
    }
  ],
  
  // Refund details
  refundAmount: { type: Number },
  refundReason: { type: String },
  refundedAt: { type: Date },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Add initial status to statusHistory when order is created
orderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  if (this.isNew && !this.statusHistory.length) {
    this.statusHistory.push({
      status: this.status || 'Order Placed',
      timestamp: new Date(),
      note: 'Order placed successfully'
    });
  }
  next();
});

// Index for faster queries (Note: orderId already has an index due to unique: true)
// Removing duplicate: orderSchema.index({ orderId: 1 }); 
orderSchema.index({ email: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
