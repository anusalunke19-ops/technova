const Category = require('../models/mongo/Category');

exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ is_active: true }).sort('category_name');
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
};

exports.getCategoryBySlug = async (req, res) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug, is_active: true });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch category' });
  }
};
