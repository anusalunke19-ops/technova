const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

let cachedCatalogue = [];
try {
  const catPath = path.join(__dirname, '../seeds/products_catalogue.json');
  if (fs.existsSync(catPath)) {
    cachedCatalogue = JSON.parse(fs.readFileSync(catPath, 'utf8'));
  }
} catch (e) {
  console.warn('⚠️ Could not load catalogue in productLookup:', e.message);
}

function normalizeProduct(item) {
  if (!item) return null;
  return {
    _id: item.product_id || item._id,
    product_id: item.product_id || item._id,
    name: item.name,
    brand: item.brand,
    price: parseFloat(item.price),
    original_price: parseFloat(item.original_price || item.price),
    images: Array.isArray(item.images)
      ? item.images
      : (item.image_url ? item.image_url.split(',').map(s => s.trim()) : []),
    category_slug: item.category_slug,
    category_id: item.category_id || { category_name: item.category, slug: item.category_slug },
    is_active: item.is_active !== undefined ? item.is_active : true,
    description: item.description,
    rating: parseFloat(item.rating) || 4.5,
    review_count: parseInt(item.review_count) || 100,
    attributes: typeof item.attributes === 'string' ? JSON.parse(item.attributes) : item.attributes,
  };
}

async function findProductByIdOrSku(id) {
  if (!id) return null;
  const strId = String(id).trim();

  // 1. Try Mongo if connected
  try {
    const Product = require('../models/mongo/Product');
    let doc = null;
    if (mongoose.Types.ObjectId.isValid(strId)) {
      doc = await Product.findById(strId);
    }
    if (!doc) {
      doc = await Product.findOne({ product_id: strId });
    }
    if (doc) return normalizeProduct(doc);
  } catch (err) {}

  // 2. Lookup in cached catalogue
  const item = cachedCatalogue.find(p => p.product_id === strId || p._id === strId);
  if (item) {
    return normalizeProduct(item);
  }

  return null;
}

async function findProductsByIdsOrSkus(ids) {
  if (!ids || ids.length === 0) return [];
  const results = [];
  const seen = new Set();

  for (const id of ids) {
    if (!id || seen.has(String(id))) continue;
    const p = await findProductByIdOrSku(id);
    if (p) {
      seen.add(String(p.product_id || p._id));
      results.push(p);
    }
  }
  return results;
}

module.exports = {
  findProductByIdOrSku,
  findProductsByIdsOrSkus,
  cachedCatalogue,
  normalizeProduct,
};
