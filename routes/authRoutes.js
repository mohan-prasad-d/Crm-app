// ============================================
// AUTH ROUTES - Login, Register, JWT
// ============================================
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { generateToken, authenticate } = require('../middleware/auth');
const { validateUser, validateEmail } = require('../utilities/validator');
const { AppError } = require('../utilities/errorHandler');
const logger = require('../utilities/logger');

// Register new user
router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password, first_name, last_name, role } = req.body;

    // Validate input
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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [result] = await pool.query(
      `INSERT INTO users 
       (username, email, password, first_name, last_name, role, is_active)
       VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
      [username, email, hashedPassword, first_name || '', last_name || '', role || 'Employee']
    );

    const token = generateToken(result.insertId, username, role || 'Employee');
    
    logger.info(`New user registered: ${username}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: result.insertId,
        username,
        email,
        role: role || 'Employee'
      }
    });
  } catch (error) {
    logger.error('Registration failed:', error.message);
    next(error);
  }
});

// Login user
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    // Find user
    const [users] = await pool.query(
      'SELECT id, username, email, password, role, is_active FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'User account is inactive' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );

    // Generate token
    const token = generateToken(user.id, user.username, user.role);

    logger.info(`User logged in: ${username}`);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('Login failed:', error.message);
    next(error);
  }
});

// Get current user info
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const [users] = await pool.query(
      'SELECT id, username, email, first_name, last_name, role, department, created_at FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: users[0]
    });
  } catch (error) {
    logger.error('Get user info failed:', error.message);
    next(error);
  }
});

// Refresh token
router.post('/refresh', authenticate, (req, res) => {
  try {
    const token = generateToken(req.user.userId, req.user.username, req.user.role);
    res.json({
      success: true,
      token
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Token refresh failed' });
  }
});

module.exports = router;
