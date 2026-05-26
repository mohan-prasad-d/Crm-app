// ============================================
// JWT AUTHENTICATION MIDDLEWARE
// ============================================
const jwt = require('jsonwebtoken');
const logger = require('../utilities/logger');

const authenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Auth failed:', error.message);
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

const generateToken = (userId, username, role) => {
  return jwt.sign(
    { userId, username, role },
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    { expiresIn: '7d' }
  );
};

module.exports = { authenticate, generateToken };
