

const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    userId: { type: String, required: true }, // Can be a User ID or Session ID
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        name: String,
        price: Number,
        quantity: { type: Number, default: 1 },
        image: String
    }],
    totalBill: { type: Number, default: 0 }
});

module.exports = mongoose.model('Cart', cartSchema);
