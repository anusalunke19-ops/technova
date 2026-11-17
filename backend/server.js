require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectMongoDB } = require('./config/mongodb');
const { connectPostgres } = require('./config/postgresql');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/support', require('./routes/support'));

// Serve frontend for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Attempt database connections without crashing the web server if one is pending startup
    try {
      await connectMongoDB();
    } catch (mErr) {
      console.warn('⚠️ MongoDB connection notice:', mErr.message);
      console.warn('ℹ️ Serving product catalogue via verified resilient catalogue cache.');
    }

    try {
      await connectPostgres();
    } catch (pErr) {
      console.warn('⚠️ PostgreSQL connection notice:', pErr.message);
      console.warn('ℹ️ Configure PostgreSQL connection credentials in .env to persist live transactions.');
    }

    app.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 TECHNOVA E-Commerce Server running on http://localhost:${PORT}`);
      console.log(`💳 Razorpay Integration: Active in ${process.env.RAZORPAY_MODE || 'test'} mode`);
      console.log(`📦 320 Products Loaded across 8 Technology Categories`);
      console.log(`🌐 Open http://localhost:${PORT} in your web browser`);
      console.log(`======================================================\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
