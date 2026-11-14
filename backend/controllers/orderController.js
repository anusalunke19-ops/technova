const { pool } = require('../config/postgresql');
const Product = require('../models/mongo/Product');
const { cartStore } = require('./cartController');

exports.createOrder = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { shippingAddress, deliveryMethod, items } = req.body;
    const customerId = req.user.customer_id;

    if (!items || items.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'No items in order' });
    }
    if (!shippingAddress) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Shipping address required' });
    }

    // Fetch products from MongoDB to verify prices (never trust frontend prices)
    const productIds = items.map(i => i.productId);
    const products = await Product.find({ _id: { $in: productIds }, is_active: true });
    const productMap = new Map(products.map(p => [String(p._id), p]));

    // Check all products exist
    for (const item of items) {
      if (!productMap.has(item.productId)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: `Product ${item.productId} not found or unavailable` });
      }
    }

    // Lock inventory rows and check stock
    for (const item of items) {
      const invResult = await client.query(
        'SELECT * FROM inventory WHERE product_id = $1 FOR UPDATE',
        [item.productId]
      );
      if (invResult.rows.length === 0 || invResult.rows[0].stock_quantity < item.quantity) {
        await client.query('ROLLBACK');
        const product = productMap.get(item.productId);
        return res.status(400).json({ success: false, message: `Insufficient stock for ${product?.name || item.productId}` });
      }
    }

    // Calculate totals using backend prices
    let subtotal = 0;
    const orderItems = items.map(item => {
      const product = productMap.get(item.productId);
      const lineTotal = product.price * item.quantity;
      subtotal += lineTotal;
      return { productId: item.productId, productName: product.name, quantity: item.quantity, unitPrice: product.price };
    });

    const shippingCost = deliveryMethod === 'express' ? 15.99 : deliveryMethod === 'overnight' ? 29.99 : (subtotal >= 100 ? 0 : 9.99);
    const taxAmount = parseFloat((subtotal * 0.08).toFixed(2));
    const totalAmount = parseFloat((subtotal + shippingCost + taxAmount).toFixed(2));

    // Create order
    const orderResult = await client.query(
      'INSERT INTO orders (customer_id, total_amount, subtotal, shipping_cost, tax_amount, shipping_address, delivery_method, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [customerId, totalAmount, subtotal, shippingCost, taxAmount, JSON.stringify(shippingAddress), deliveryMethod || 'standard', 'pending']
    );
    const order = orderResult.rows[0];

    // Create order items
    for (const item of orderItems) {
      await client.query(
        'INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price) VALUES ($1, $2, $3, $4, $5)',
        [order.order_id, item.productId, item.productName, item.quantity, item.unitPrice]
      );
    }

    // Create pending payment record
    await client.query(
      "INSERT INTO payments (order_id, amount, payment_status) VALUES ($1, $2, 'pending')",
      [order.order_id, totalAmount]
    );

    // Deduct inventory
    for (const item of items) {
      await client.query(
        'UPDATE inventory SET stock_quantity = stock_quantity - $1 WHERE product_id = $2',
        [item.quantity, item.productId]
      );
    }

    await client.query('COMMIT');

    // Clear cart after successful order
    cartStore.delete(String(customerId));

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: { ...order, items: orderItems }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create order error:', error);
    res.status(500).json({ success: false, message: 'Failed to create order. Please try again.' });
  } finally {
    client.release();
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const { status } = req.query;
    let query = `SELECT o.*, p.payment_status, p.payment_method, p.payment_reference,
      (SELECT json_agg(json_build_object('product_id', oi.product_id, 'product_name', oi.product_name, 'quantity', oi.quantity, 'unit_price', oi.unit_price))
       FROM order_items oi WHERE oi.order_id = o.order_id) as items
      FROM orders o
      LEFT JOIN payments p ON o.order_id = p.order_id
      WHERE o.customer_id = $1`;
    const params = [req.user.customer_id];
    if (status && status !== 'all') {
      query += ' AND o.status = $2';
      params.push(status);
    }
    query += ' ORDER BY o.order_date DESC';
    const result = await pool.query(query, params);
    res.json({ success: true, orders: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, p.payment_status, p.payment_method, p.payment_reference, p.payment_date,
        (SELECT json_agg(json_build_object('product_id', oi.product_id, 'product_name', oi.product_name, 'quantity', oi.quantity, 'unit_price', oi.unit_price, 'total_price', oi.total_price))
         FROM order_items oi WHERE oi.order_id = o.order_id) as items
       FROM orders o
       LEFT JOIN payments p ON o.order_id = p.order_id
       WHERE o.order_id = $1 AND o.customer_id = $2`,
      [req.params.id, req.user.customer_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch order' });
  }
};
