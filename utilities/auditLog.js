// ============================================
// AUDIT LOGGING UTILITY
// ============================================
const pool = require('../config/db');
const logger = require('./logger');

const logAudit = async (userId, action, entityType, entityId, oldValues = null, newValues = null, req) => {
  try {
    const ipAddress = req?.ip || req?.connection?.remoteAddress || null;
    const userAgent = req?.headers['user-agent'] || null;

    await pool.query(
      `INSERT INTO audit_logs 
       (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        action,
        entityType,
        entityId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress,
        userAgent
      ]
    );

    logger.info({
      message: `Audit log: ${action} on ${entityType}`,
      userId,
      action,
      entityType,
      entityId
    });
  } catch (error) {
    logger.error('Audit logging failed:', error.message);
    // Don't throw - audit failure shouldn't crash the app
  }
};

const logActivity = async (userId, type, description, module, moduleId) => {
  try {
    await pool.query(
      `INSERT INTO activities 
       (user_id, type, description, module, module_id)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, type, description, module, moduleId]
    );
  } catch (error) {
    logger.error('Activity logging failed:', error.message);
  }
};

module.exports = { logAudit, logActivity };
