const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Product = require('../models/mongo/Product');
const Category = require('../models/mongo/Category');

// Category slug alias dictionary for universal compatibility
const SLUG_ALIASES = {
  'audio': 'headphones-earbuds',
  'headphones': 'headphones-earbuds',
  'headphone': 'headphones-earbuds',
  'wearables': 'smartwatches',
  'wearable': 'smartwatches',
  'accessories': 'computer-accessories',
  'computer_accessories': 'computer-accessories',
};

function normalizeSlug(slug) {
  if (!slug) return slug;
  const s = String(slug).toLowerCase().trim();
  return SLUG_ALIASES[s] || s;
}

// Load static 320-product catalogue as fallback when MongoDB is offline/unseeded
let cachedCatalogue = [];
const cataloguePath = path.join(__dirname, '../seeds/products_catalogue.json');
try {
  if (fs.existsSync(cataloguePath)) {
    const raw = fs.readFileSync(cataloguePath, 'utf8');
    cachedCatalogue = JSON.parse(raw).map((p, idx) => ({
      _id: p.product_id || `mock_${idx + 1}`,
      product_id: p.product_id,
      name: p.name,
      brand: p.brand,
      price: parseFloat(p.price),
      original_price: parseFloat(p.original_price || p.price),
      description: p.description,
      images: p.image_url ? p.image_url.split(',').map(s => s.trim()) : [],
      category_slug: p.category_slug,
      category_id: { category_name: p.category, slug: p.category_slug },
      attributes: typeof p.attributes === 'string' ? JSON.parse(p.attributes) : p.attributes,
      rating: parseFloat(p.rating) || 4.5,
      review_count: parseInt(p.review_count) || 100,
      tags: p.tags ? p.tags.split(',').map(t => t.trim().toLowerCase()) : [],
      is_active: true,
      is_featured: String(p.is_featured).toLowerCase() === 'true',
    }));
    console.log(`📦 Loaded ${cachedCatalogue.length} products into catalogue fallback cache`);
  }
} catch (err) {
  console.warn('⚠️ Could not load catalogue fallback JSON:', err.message);
}

// Fallback filter & search helper
const SEARCH_SYNONYMS = {
  'phone': 'smartphones',
  'phones': 'smartphones',
  'smartphone': 'smartphones',
  'smartphones': 'smartphones',
  'mobile': 'smartphones',
  'mobiles': 'smartphones',
  'cellphone': 'smartphones',
  'cellphones': 'smartphones',
  'laptop': 'laptops',
  'laptops': 'laptops',
  'notebook': 'laptops',
  'notebooks': 'laptops',
  'macbook': 'laptops',
  'chromebook': 'laptops',
  'tablet': 'tablets',
  'tablets': 'tablets',
  'ipad': 'tablets',
  'headphone': 'headphones-earbuds',
  'headphones': 'headphones-earbuds',
  'earbud': 'headphones-earbuds',
  'earbuds': 'headphones-earbuds',
  'earphone': 'headphones-earbuds',
  'earphones': 'headphones-earbuds',
  'audio': 'headphones-earbuds',
  'airpods': 'headphones-earbuds',
  'watch': 'smartwatches',
  'watches': 'smartwatches',
  'smartwatch': 'smartwatches',
  'smartwatches': 'smartwatches',
  'wearable': 'smartwatches',
  'wearables': 'smartwatches',
  'camera': 'cameras',
  'cameras': 'cameras',
  'cam': 'cameras',
  'dslr': 'cameras',
  'mirrorless': 'cameras',
  'accessory': 'computer-accessories',
  'accessories': 'computer-accessories',
  'keyboard': 'computer-accessories',
  'mouse': 'computer-accessories',
  'monitor': 'computer-accessories',
  'game': 'gaming',
  'games': 'gaming',
  'gaming': 'gaming',
  'console': 'gaming',
  'consoles': 'gaming',
  'playstation': 'gaming',
  'ps5': 'gaming',
  'xbox': 'gaming',
  'nintendo': 'gaming',
};

function filterFallbackProducts({ category, slug, minPrice, maxPrice, rating, brand, q, search, sort, page = 1, limit = 12 }) {
  let list = [...cachedCatalogue];

  const catTarget = normalizeSlug(slug || category);
  if (catTarget) {
    list = list.filter(p => p.category_slug === catTarget || normalizeSlug(p.category_slug) === catTarget);
  }
  if (minPrice) {
    list = list.filter(p => p.price >= parseFloat(minPrice));
  }
  if (maxPrice) {
    list = list.filter(p => p.price <= parseFloat(maxPrice));
  }
  if (rating) {
    list = list.filter(p => p.rating >= parseFloat(rating));
  }
  if (brand) {
    const bLower = brand.toLowerCase();
    list = list.filter(p => p.brand.toLowerCase().includes(bLower));
  }

  const queryStr = (q || search || '').trim();
  if (queryStr) {
    const cleanQ = queryStr.toLowerCase();
    const tokens = cleanQ.split(/[\s,+/]+/).filter(t => t.length > 0);

    const scored = [];

    for (const p of list) {
      const pName = (p.name || '').toLowerCase();
      const pBrand = (p.brand || '').toLowerCase();
      const pDesc = (p.description || '').toLowerCase();
      const pCatSlug = (p.category_slug || '').toLowerCase();
      const pCatName = (p.category_id?.category_name || p.category || '').toLowerCase();
      const pTags = Array.isArray(p.tags) ? p.tags.join(' ').toLowerCase() : (p.tags || '').toLowerCase();
      let pAttrs = '';
      if (p.attributes) {
        if (typeof p.attributes === 'string') pAttrs = p.attributes.toLowerCase();
        else if (p.attributes instanceof Map) pAttrs = Array.from(p.attributes.values()).join(' ').toLowerCase();
        else pAttrs = Object.values(p.attributes).join(' ').toLowerCase();
      }

      const fullHaystack = `${pName} ${pBrand} ${pCatSlug} ${pCatName} ${pDesc} ${pTags} ${pAttrs}`;

      let score = 0;

      // Exact full match bonuses
      if (pName.includes(cleanQ)) score += 100;
      if (pBrand.includes(cleanQ)) score += 60;
      if (pCatSlug.includes(cleanQ) || pCatName.includes(cleanQ)) score += 80;
      if (pTags.includes(cleanQ)) score += 40;

      // Multi-token evaluation: Every token must match
      const allTokensMatch = tokens.every(token => {
        let matched = false;
        if (pName.includes(token)) { score += 35; matched = true; }
        if (pBrand.includes(token)) { score += 30; matched = true; }
        if (pCatSlug.includes(token) || pCatName.includes(token)) { score += 45; matched = true; }
        if (pTags.includes(token)) { score += 20; matched = true; }
        if (pDesc.includes(token)) { score += 10; matched = true; }
        if (pAttrs.includes(token)) { score += 5; matched = true; }

        // Synonym match
        const synCategory = SEARCH_SYNONYMS[token];
        if (synCategory && (pCatSlug.includes(synCategory) || normalizeSlug(pCatSlug) === synCategory || pCatName.includes(synCategory))) {
          score += 50;
          matched = true;
        }

        // Stem match (e.g., 'smartphones' -> 'smartphone')
        if (!matched) {
          if (token.endsWith('es') && fullHaystack.includes(token.slice(0, -2))) {
            score += 15;
            matched = true;
          } else if (token.endsWith('s') && fullHaystack.includes(token.slice(0, -1))) {
            score += 15;
            matched = true;
          }
        }
        return matched;
      });

      if (allTokensMatch && score > 0) {
        scored.push({ product: p, score });
      }
    }

    // Default ranking by relevance score
    scored.sort((a, b) => b.score - a.score);
    list = scored.map(item => item.product);
  }

  // Sorting
  if (sort === 'price') {
    list.sort((a, b) => a.price - b.price);
  } else if (sort === '-price') {
    list.sort((a, b) => b.price - a.price);
  } else if (sort === '-rating') {
    list.sort((a, b) => b.rating - a.rating);
  } else if (sort === '-createdAt') {
    // Newest
  } else if (!queryStr) {
    // default featured ranking when no search query
    list.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));
  }

  const total = list.length;
  const pNum = parseInt(page) || 1;
  const lNum = parseInt(limit) || 12;
  const skip = (pNum - 1) * lNum;
  const paginated = list.slice(skip, skip + lNum);

  return {
    products: paginated,
    total,
    page: pNum,
    pages: Math.ceil(total / lNum) || 1,
  };
}

exports.getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 12, sort = '-createdAt', minPrice, maxPrice, rating, brand, category, search, q } = req.query;
    const queryStr = q || search || '';

    if (mongoose.connection.readyState === 1 && !queryStr) {
      const filter = { is_active: true };
      if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = parseFloat(minPrice);
        if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
      }
      if (rating) filter.rating = { $gte: parseFloat(rating) };
      if (brand) filter.brand = { $regex: brand, $options: 'i' };
      if (category) filter.category_slug = normalizeSlug(category);

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const [products, total] = await Promise.all([
        Product.find(filter).sort(sort).skip(skip).limit(parseInt(limit)).populate('category_id', 'category_name slug'),
        Product.countDocuments(filter),
      ]);

      if (products && products.length > 0) {
        return res.json({ success: true, products, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
      }
    }

    // Fallback if Mongo is offline or empty or if queryStr is provided
    const fallback = filterFallbackProducts({ category, minPrice, maxPrice, rating, brand, sort, page, limit, q: queryStr });
    res.json({ success: true, ...fallback });
  } catch (error) {
    const fallback = filterFallbackProducts(req.query);
    res.json({ success: true, ...fallback });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const targetId = req.params.id;
    let product = null;

    if (mongoose.connection.readyState === 1) {
      if (mongoose.Types.ObjectId.isValid(targetId)) {
        product = await Product.findById(targetId).populate('category_id', 'category_name slug');
      }
      if (!product) {
        product = await Product.findOne({ product_id: targetId }).populate('category_id', 'category_name slug');
      }

      if (product && product.is_active) {
        return res.json({ success: true, product });
      }
    }

    // Fallback search
    const fallback = cachedCatalogue.find(p => p._id === targetId || p.product_id === targetId || p.name === targetId);
    if (fallback) {
      return res.json({ success: true, product: fallback });
    }

    res.status(404).json({ success: false, message: 'Product not found' });
  } catch (error) {
    const fallback = cachedCatalogue.find(p => p._id === req.params.id || p.product_id === req.params.id);
    if (fallback) {
      return res.json({ success: true, product: fallback });
    }
    res.status(500).json({ success: false, message: 'Failed to fetch product' });
  }
};

exports.searchProducts = async (req, res) => {
  try {
    const q = req.query.q || req.query.search || req.query.query || '';
    const { page = 1, limit = 12, sort = '-rating', minPrice, maxPrice, category } = req.query;
    if (!q || !q.trim()) return res.json({ success: true, products: [], total: 0, query: '' });

    if (mongoose.connection.readyState === 1) {
      const filter = { is_active: true, $text: { $search: q.trim() } };
      if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = parseFloat(minPrice);
        if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
      }
      if (category) filter.category_slug = normalizeSlug(category);
      const skip = (parseInt(page) - 1) * parseInt(limit);

      try {
        const [products, total] = await Promise.all([
          Product.find(filter, { score: { $meta: 'textScore' } })
            .sort({ score: { $meta: 'textScore' } })
            .skip(skip).limit(parseInt(limit))
            .populate('category_id', 'category_name slug'),
          Product.countDocuments(filter),
        ]);

        if (products && products.length > 0) {
          return res.json({ success: true, products, total, query: q, pages: Math.ceil(total / parseInt(limit)) || 1 });
        }
      } catch (mongoErr) {
        // Text index might not exist yet, safely continue to fallback search
      }
    }

    // Fallback search with multi-token ranking
    const fallback = filterFallbackProducts({ q: q.trim(), category, minPrice, maxPrice, sort, page, limit });
    res.json({ success: true, ...fallback, query: q.trim() });
  } catch (error) {
    const q = req.query.q || req.query.search || req.query.query || '';
    const fallback = filterFallbackProducts({ q: q ? q.trim() : '', ...req.query });
    res.json({ success: true, ...fallback, query: q });
  }
};

exports.getProductsByCategory = async (req, res) => {
  try {
    const slug = normalizeSlug(req.params.slug);
    const { page = 1, limit = 12, sort = '-createdAt', minPrice, maxPrice, rating } = req.query;

    if (mongoose.connection.readyState === 1) {
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
        Product.countDocuments(filter),
      ]);

      if (products && products.length > 0) {
        return res.json({ success: true, products, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
      }
    }

    // Fallback
    const fallback = filterFallbackProducts({ slug, minPrice, maxPrice, rating, sort, page, limit });
    res.json({ success: true, ...fallback });
  } catch (error) {
    const fallback = filterFallbackProducts({ slug: req.params.slug, ...req.query });
    res.json({ success: true, ...fallback });
  }
};

exports.getFeaturedProducts = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const products = await Product.find({ is_active: true, is_featured: true }).limit(8).populate('category_id', 'category_name slug');
      if (products && products.length > 0) {
        return res.json({ success: true, products });
      }
    }
    const fallback = cachedCatalogue.filter(p => p.is_featured).slice(0, 8);
    res.json({ success: true, products: fallback });
  } catch (error) {
    const fallback = cachedCatalogue.filter(p => p.is_featured).slice(0, 8);
    res.json({ success: true, products: fallback });
  }
};

exports.compareProducts = async (req, res) => {
  try {
    const { ids } = req.query;
    if (!ids) return res.status(400).json({ success: false, message: 'Product IDs required' });
    const idArray = ids.split(',').slice(0, 4);

    if (mongoose.connection.readyState === 1) {
      let products = await Product.find({
        $or: [
          { _id: { $in: idArray.filter(id => mongoose.Types.ObjectId.isValid(id)) } },
          { product_id: { $in: idArray } },
        ],
        is_active: true,
      }).populate('category_id', 'category_name slug');

      if (products && products.length > 0) {
        return res.json({ success: true, products });
      }
    }

    const fallback = cachedCatalogue.filter(p => idArray.includes(p._id) || idArray.includes(p.product_id));
    res.json({ success: true, products: fallback });
  } catch (error) {
    const idArray = (req.query.ids || '').split(',');
    const fallback = cachedCatalogue.filter(p => idArray.includes(p._id) || idArray.includes(p.product_id));
    res.json({ success: true, products: fallback });
  }
};
