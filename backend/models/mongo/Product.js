const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user_name: { type: String },
  rating: { type: Number, min: 1, max: 5 },
  comment: { type: String },
  date: { type: Date, default: Date.now }
});

const productSchema = new mongoose.Schema({
  product_id: { type: String, sparse: true, index: true },
  name: { type: String, required: true, trim: true },
  brand: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  original_price: { type: Number },
  description: { type: String },
  images: [{ type: String }],
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  category_slug: { type: String, required: true },
  attributes: { type: Map, of: mongoose.Schema.Types.Mixed },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  review_count: { type: Number, default: 0 },
  reviews: [reviewSchema],
  tags: [{ type: String }],
  is_active: { type: Boolean, default: true },
  is_featured: { type: Boolean, default: false }
}, { timestamps: true });

// Text index for search
productSchema.index({ name: 'text', brand: 'text', description: 'text', tags: 'text' });
productSchema.index({ category_id: 1 });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });

module.exports = mongoose.model('Product', productSchema);
