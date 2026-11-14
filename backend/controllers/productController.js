const Product = require('../models/mongo/Product');
const Category = require('../models/mongo/Category');

exports.getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 12, sort = '-createdAt', minPrice, maxPrice, rating, brand, category } = req.query;
    const filter = { is_active: true };
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    if (rating) filter.rating = { $gte: parseFloat(rating) };
    if (brand) filter.brand = { $regex: brand, $options: 'i' };
    if (category) filter.category_slug = category;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [products, total] = await Promise.all([
      Product.find(filter).sort(sort).skip(skip).limit(parseInt(limit)).populate('category_id', 'category_name slug'),
      Product.countDocuments(filter)
    ]);
    res.json({ success: true, products, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category_id', 'category_name slug');
    if (!product || !product.is_active) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch product' });
  }
};

exports.searchProducts = async (req, res) => {
  try {
    const { q, page = 1, limit = 12, sort = '-rating', minPrice, maxPrice, category } = req.query;
    if (!q) return res.json({ success: true, products: [], total: 0 });
    const filter = { is_active: true, $text: { $search: q } };
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    if (category) filter.category_slug = category;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [products, total] = await Promise.all([
      Product.find(filter, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip).limit(parseInt(limit))
        .populate('category_id', 'category_name slug'),
      Product.countDocuments(filter)
    ]);
    res.json({ success: true, products, total, query: q });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Search failed' });
  }
};

exports.getProductsByCategory = async (req, res) => {
  try {
    const { slug } = req.params;
    const { page = 1, limit = 12, sort = '-createdAt', minPrice, maxPrice, rating } = req.query;
    const filter = { is_active: true, category_slug: slug };
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    if (rating) filter.rating = { $gte: parseFloat(rating) };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [products, total] = await Promise.all([
      Product.find(filter).sort(sort).skip(skip).limit(parseInt(limit)).populate('category_id', 'category_name slug'),
      Product.countDocuments(filter)
    ]);
    res.json({ success: true, products, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch products by category' });
  }
};

exports.getFeaturedProducts = async (req, res) => {
  try {
    const products = await Product.find({ is_active: true, is_featured: true }).limit(8).populate('category_id', 'category_name slug');
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch featured products' });
  }
};

exports.compareProducts = async (req, res) => {
  try {
    const { ids } = req.query;
    if (!ids) return res.status(400).json({ success: false, message: 'Product IDs required' });
    const idArray = ids.split(',').slice(0, 4);
    const products = await Product.find({ _id: { $in: idArray }, is_active: true }).populate('category_id', 'category_name slug');
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch products for comparison' });
  }
};
