const { pool } = require('../config/postgresql');
const { findProductsByIdsOrSkus } = require('../utils/productLookup');
const { cartStore } = require('./cartController');

exports.createOrder = async (req, res) => {
  let client;
  try {
    const { shippingAddress, deliveryMethod, items } = req.body;
    const customerId = req.user.customer_id;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No items in order' });
    }
    if (!shippingAddress) {
      return res.status(400).json({ success: false, message: 'Shipping address required' });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    // Fetch products to verify real backend database prices
    const productIds = items.map(i => String(i.productId));
    const products = await findProductsByIdsOrSkus(productIds);

    const productMap = new Map();
    products.forEach(p => {
      productMap.set(String(p._id), p);
      if (p.product_id) productMap.set(String(p.product_id), p);
    });

    // Check all products exist
    for (const item of items) {
      const pIdStr = String(item.productId);
      if (!productMap.has(pIdStr)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: `Product ${item.productId} not found or unavailable` });
      }
    }

    // Check stock availability in PostgreSQL inventory table
    const inventoryMap = new Map();
    for (const item of items) {
      const invResult = await client.query(
        'SELECT inventory_id, product_id, stock_quantity, threshold FROM inventory WHERE product_id = $1',
        [String(item.productId)]
      );
      if (invResult.rows.length === 0 || invResult.rows[0].stock_quantity < item.quantity) {
        await client.query('ROLLBACK');
        const available = invResult.rows.length > 0 ? invResult.rows[0].stock_quantity : 0;
        const product = productMap.get(String(item.productId));
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product?.name || item.productId}. Available: ${available}`
        });
      }
      inventoryMap.set(String(item.productId), invResult.rows[0]);
    }

    // Calculate totals strictly using backend database prices
    let subtotal = 0;
    const orderItems = items.map(item => {
      const product = productMap.get(String(item.productId));
      const lineTotal = product.price * item.quantity;
      subtotal += lineTotal;
      return {
        productId: String(product.product_id || product._id),
        productName: product.name,
        quantity: parseInt(item.quantity),
        unitPrice: product.price
      };
    });

    const shippingCost = deliveryMethod === 'express' ? 15.99 : deliveryMethod === 'overnight' ? 29.99 : (subtotal >= 100 ? 0 : 9.99);
    const taxAmount = parseFloat((subtotal * 0.08).toFixed(2));
    const totalAmount = parseFloat((subtotal + shippingCost + taxAmount).toFixed(2));

    // Create order in PostgreSQL orders table
    const orderResult = await client.query(
      `INSERT INTO orders (customer_id, total_amount, subtotal, shipping_cost, tax_amount, shipping_address, delivery_method, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [customerId, totalAmount, subtotal, shippingCost, taxAmount, JSON.stringify(shippingAddress), deliveryMethod || 'standard', 'pending']
    );
    const order = orderResult.rows[0];

    // Create order items in PostgreSQL order_items table
    for (const item of orderItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [order.order_id, item.productId, item.productName, item.quantity, item.unitPrice, parseFloat((item.quantity * item.unitPrice).toFixed(2))]
      );
    }

    // Create initial pending payment record in PostgreSQL payments table
    await client.query(
      `INSERT INTO payments (order_id, amount, payment_status, currency)
       VALUES ($1, $2, 'pending', 'INR')`,
      [order.order_id, totalAmount]
    );

    // Deduct stock in PostgreSQL inventory table
    for (const item of items) {
      const inv = inventoryMap.get(String(item.productId));
      const newStock = inv.stock_quantity - parseInt(item.quantity);

      const updateRes = await client.query(
        'UPDATE inventory SET stock_quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE product_id = $2 RETURNING inventory_id, stock_quantity, threshold',
        [newStock, String(item.productId)]
      );

      if (updateRes.rows.length > 0) {
        const updatedInv = updateRes.rows[0];
        // Trigger low stock alert if stock falls below or equal to threshold
        if (updatedInv.stock_quantity <= updatedInv.threshold) {
          const alertCheck = await client.query(
            'SELECT alert_id FROM low_stock_alerts WHERE inventory_id = $1 AND alert_status = $2',
            [updatedInv.inventory_id, 'active']
          );
          if (alertCheck.rows.length === 0) {
            await client.query(
              'INSERT INTO low_stock_alerts (inventory_id, current_stock, threshold, alert_status) VALUES ($1, $2, $3, $4)',
              [updatedInv.inventory_id, updatedInv.stock_quantity, updatedInv.threshold, 'active']
            );
          } else {
            await client.query(
              'UPDATE low_stock_alerts SET current_stock = $1 WHERE alert_id = $2',
              [updatedInv.stock_quantity, alertCheck.rows[0].alert_id]
            );
          }
        }
      }
    }

    await client.query('COMMIT');

    // Clear cart after successful order placement
    cartStore.delete(String(customerId));

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: { ...order, items: orderItems }
    });
  } catch (error) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch {}
    }
    console.error('Create order error:', error);
    res.status(500).json({ success: false, message: 'Failed to create order. Please try again.' });
  } finally {
    if (client) client.release();
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const { status } = req.query;
    let query = `SELECT o.*, p.payment_status, p.payment_method, p.payment_reference
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
    const orders = result.rows;

    for (const ord of orders) {
      const itemsRes = await pool.query(
        'SELECT product_id, product_name, quantity, unit_price, total_price FROM order_items WHERE order_id = $1',
        [ord.order_id]
      );
      ord.items = itemsRes.rows;
    }

    res.json({ success: true, orders });
  } catch (error) {
    console.error('getMyOrders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, p.payment_status, p.payment_method, p.payment_reference, p.payment_date
       FROM orders o
       LEFT JOIN payments p ON o.order_id = p.order_id
       WHERE o.order_id = $1 AND o.customer_id = $2`,
      [req.params.id, req.user.customer_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Order not found' });
    const order = result.rows[0];

    const itemsRes = await pool.query(
      'SELECT product_id, product_name, quantity, unit_price, total_price FROM order_items WHERE order_id = $1',
      [order.order_id]
    );
    order.items = itemsRes.rows;

    res.json({ success: true, order });
  } catch (error) {
    console.error('getOrderById error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch order' });
  }
};
