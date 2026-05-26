// ============================================
// ROLE-BASED ACCESS CONTROL MIDDLEWARE
// ============================================
const logger = require('../utilities/logger');

// Define role-based permissions
const rolePermissions = {
  Admin: {
    leads: ['create', 'read', 'update', 'delete', 'assign'],
    contacts: ['create', 'read', 'update', 'delete'],
    deals: ['create', 'read', 'update', 'delete', 'assign'],
    tasks: ['create', 'read', 'update', 'delete', 'assign'],
    users: ['create', 'read', 'update', 'delete'],
    reports: ['read', 'export'],
    settings: ['read', 'update']
  },
  Manager: {
    leads: ['create', 'read', 'update', 'delete', 'assign'],
    contacts: ['create', 'read', 'update', 'delete'],
    deals: ['create', 'read', 'update', 'delete', 'assign'],
    tasks: ['create', 'read', 'update', 'delete', 'assign'],
    users: ['read'],
    reports: ['read', 'export'],
    settings: ['read']
  },
  Employee: {
    leads: ['create', 'read', 'update'],
    contacts: ['create', 'read', 'update'],
    deals: ['create', 'read', 'update'],
    tasks: ['create', 'read', 'update'],
    users: ['read'],
    reports: ['read'],
    settings: []
  }
};

const authorize = (resource, action) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const userRole = req.user.role;
      const permissions = rolePermissions[userRole] || {};
      const resourcePermissions = permissions[resource] || [];

      if (!resourcePermissions.includes(action)) {
        logger.warn(`Access denied for user ${req.user.username} - Resource: ${resource}, Action: ${action}`);
        return res.status(403).json({ success: false, message: 'Insufficient permissions' });
      }

      next();
    } catch (error) {
      logger.error('Authorization error:', error.message);
      return res.status(500).json({ success: false, message: 'Authorization error' });
    }
  };
};

module.exports = { authorize, rolePermissions };
