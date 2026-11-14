const bcrypt = require('bcryptjs');
const { pool } = require('../config/postgresql');

exports.getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT customer_id, name, email, phone, address, city, state, zip_code, country, created_at FROM customers WHERE customer_id = $1',
      [req.user.customer_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Profile not found' });
    res.json({ success: true, customer: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get profile' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, address, city, state, zip_code, country } = req.body;
    const result = await pool.query(
      'UPDATE customers SET name=$1, phone=$2, address=$3, city=$4, state=$5, zip_code=$6, country=$7 WHERE customer_id=$8 RETURNING customer_id, name, email, phone, address, city, state, zip_code, country',
      [name, phone, address, city, state, zip_code, country || 'United States', req.user.customer_id]
    );
    res.json({ success: true, customer: result.rows[0], message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Current and new password required' });
    if (newPassword.length < 6) return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    const result = await pool.query('SELECT password_hash FROM customers WHERE customer_id = $1', [req.user.customer_id]);
    const isMatch = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE customers SET password_hash = $1 WHERE customer_id = $2', [newHash, req.user.customer_id]);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
};
