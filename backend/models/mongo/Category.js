const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  category_name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String },
  icon: { type: String, default: '📱' },
  image: { type: String },
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
