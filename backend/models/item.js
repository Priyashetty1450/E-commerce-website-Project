const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    cat: { type: String, required: true },
    img: String,
    title: { type: String, required: true },
    price: { type: Number, required: true },
    desc: String
});

module.exports = mongoose.model('Item', itemSchema);