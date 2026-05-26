// ============================================
// USERS MANAGEMENT ROUTES
// ============================================
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validateUser } = require('../utilities/validator');
const { logAudit } = require('../utilities/auditLog');
const logger = require('../utilities/logger');

// Get all users (Admin & Manager only)
router.get('/', authenticate, authorize('users', 'read'), async (req, res, next) => {
  try {
    const [users] = await pool.query(
      'SELECT id, username, email, first_name, last_name, role, department, is_active, last_login, created_at FROM users ORDER BY created_at DESC'
    );

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    logger.error('Get users failed:', error.message);
    next(error);
  }
});

// Get single user
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const [users] = await pool.query(
      'SELECT id, username, email, first_name, last_name, role, department, is_active, created_at FROM users WHERE id = ?',
      [req.params.id]
    );

    if (!users.length) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: users[0]
    });
  } catch (error) {
    logger.error('Get user failed:', error.message);
    next(error);
  }
});

// Create user (Admin only)
router.post('/', authenticate, authorize('users', 'create'), async (req, res, next) => {
  try {
    const { username, email, password, first_name, last_name, role, department } = req.body;

    const validation = validateUser({ username, email, password });
    if (!validation.isValid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }

    // Check if user exists
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO users 
       (username, email, password, first_name, last_name, role, department, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [username, email, hashedPassword, first_name || '', last_name || '', role || 'Employee', department || '']
    );

    // Log audit
    await logAudit(req.user.userId, 'CREATE', 'user', result.insertId, null, { username, email, role });

    logger.info(`User created: ${username}`);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    logger.error('Create user failed:', error.message);
    next(error);
  }
});

// Update user
router.put('/:id', authenticate, authorize('users', 'update'), async (req, res, next) => {
  try {
    const { first_name, last_name, role, department, is_active } = req.body;

    const [user] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user.length) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await pool.query(
      `UPDATE users 
       SET first_name = ?, last_name = ?, role = ?, department = ?, is_active = ?
       WHERE id = ?`,
      [first_name, last_name, role, department, is_active, req.params.id]
    );

    // Log audit
    await logAudit(req.user.userId, 'UPDATE', 'user', req.params.id, user[0], { first_name, last_name, role });

    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    logger.error('Update user failed:', error.message);
    next(error);
  }
});

// Change user password
router.put('/:id/password', authenticate, async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;

    // Can only change own password or admin can change any
    if (req.user.userId !== parseInt(req.params.id) && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Cannot change other users\' password' });
    }

    const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [req.params.id]);
    if (!users.length) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (req.user.userId === parseInt(req.params.id)) {
      // Verify current password
      const isValid = await bcrypt.compare(current_password, users[0].password);
      if (!isValid) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect' });
      }
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.params.id]);

    logger.info(`Password changed for user ID: ${req.params.id}`);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    logger.error('Change password failed:', error.message);
    next(error);
  }
});

// Delete user (Admin only)
router.delete('/:id', authenticate, authorize('users', 'delete'), async (req, res, next) => {
  try {
    const [user] = await pool.query('SELECT username FROM users WHERE id = ?', [req.params.id]);
    if (!user.length) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent deleting the last admin
    const [adminCount] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = "Admin"');
    if (adminCount[0].count === 1) {
      const [lastAdmin] = await pool.query('SELECT id FROM users WHERE role = "Admin"');
      if (lastAdmin[0].id === parseInt(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Cannot delete the last admin user' });
      }
    }

    await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);

    // Log audit
    await logAudit(req.user.userId, 'DELETE', 'user', req.params.id, user[0], null);

    logger.info(`User deleted: ${user[0].username}`);

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Delete user failed:', error.message);
    next(error);
  }
});

module.exports = router;
