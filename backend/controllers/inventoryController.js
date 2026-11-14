const { pool } = require('../config/postgresql');

exports.getInventory = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory ORDER BY stock_quantity ASC');
    res.json({ success: true, inventory: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch inventory' });
  }
};

exports.getInventoryByProductId = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory WHERE product_id = $1', [req.params.productId]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Inventory record not found' });
    res.json({ success: true, inventory: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch inventory' });
  }
};

exports.updateInventory = async (req, res) => {
  try {
    const { stock_quantity, threshold } = req.body;
    const result = await pool.query(
      'UPDATE inventory SET stock_quantity=$1, threshold=$2 WHERE product_id=$3 RETURNING *',
      [stock_quantity, threshold, req.params.productId]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Inventory record not found' });
    res.json({ success: true, inventory: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update inventory' });
  }
};

exports.getLowStockAlerts = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, i.product_id FROM low_stock_alerts a
       JOIN inventory i ON a.inventory_id = i.inventory_id
       WHERE a.alert_status = 'active' ORDER BY a.created_at DESC`
    );
    res.json({ success: true, alerts: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch alerts' });
  }
};
