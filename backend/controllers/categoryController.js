const mongoose = require('mongoose');
const Category = require('../models/mongo/Category');

const DEFAULT_CATEGORIES = [
  { category_name: 'Smartphones', slug: 'smartphones', description: 'Latest flagship, mid-range, and budget smartphones', icon: '📱', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400', is_active: true },
  { category_name: 'Laptops', slug: 'laptops', description: 'High-performance ultrabooks, gaming laptops, and creator workstations', icon: '💻', image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400', is_active: true },
  { category_name: 'Tablets', slug: 'tablets', description: 'Versatile tablets for productivity, creativity, and streaming', icon: '📟', image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400', is_active: true },
  { category_name: 'Headphones & Earbuds', slug: 'audio', description: 'Audiophile headphones, ANC over-ears, and wireless earbuds', icon: '🎧', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', is_active: true },
  { category_name: 'Smartwatches', slug: 'wearables', description: 'Advanced fitness trackers, GPS sports watches, and luxury wearables', icon: '⌚', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', is_active: true },
  { category_name: 'Cameras', slug: 'cameras', description: 'Mirrorless, DSLR, action cameras, and professional creator gear', icon: '📷', image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400', is_active: true },
  { category_name: 'Computer Accessories', slug: 'accessories', description: 'Monitors, ergonomic keyboards, precision mice, docks, and storage', icon: '🖥️', image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400', is_active: true },
  { category_name: 'Gaming', slug: 'gaming', description: 'Consoles, controllers, VR headsets, mechanical keyboards, and gaming gear', icon: '🎮', image: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=400', is_active: true }
];

exports.getCategories = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const categories = await Category.find({ is_active: true }).sort('category_name');
      if (categories && categories.length > 0) {
        return res.json({ success: true, categories });
      }
    }
    res.json({ success: true, categories: DEFAULT_CATEGORIES });
  } catch (error) {
    res.json({ success: true, categories: DEFAULT_CATEGORIES });
  }
};

exports.getCategoryBySlug = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const category = await Category.findOne({ slug: req.params.slug, is_active: true });
      if (category) {
        return res.json({ success: true, category });
      }
    }
    const fallback = DEFAULT_CATEGORIES.find(c => c.slug === req.params.slug);
    if (!fallback) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, category: fallback });
  } catch (error) {
    const fallback = DEFAULT_CATEGORIES.find(c => c.slug === req.params.slug);
    if (!fallback) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, category: fallback });
  }
};
