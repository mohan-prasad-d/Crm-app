// ============================================
// NOTIFICATION SERVICE
// ============================================
const pool = require('../config/db');
const logger = require('./logger');
const emailService = require('./emailService');

const createNotification = async (userId, type, title, message, relatedType = null, relatedId = null, sendEmail = false) => {
  try {
    const [result] = await pool.query(
      `INSERT INTO notifications 
       (user_id, type, title, message, related_type, related_id, is_read)
       VALUES (?, ?, ?, ?, ?, ?, FALSE)`,
      [userId, type, title, message, relatedType, relatedId]
    );

    // Get user email if email notification needed
    if (sendEmail) {
      const [users] = await pool.query(
        'SELECT email, first_name FROM users WHERE id = ?',
        [userId]
      );

      if (users.length > 0) {
        await emailService.sendNotificationEmail(
          users[0].email,
          users[0].first_name,
          title,
          message
        );
      }
    }

    logger.info(`Notification created for user ${userId}: ${type}`);
    return result.insertId;
  } catch (error) {
    logger.error('Failed to create notification:', error.message);
    throw error;
  }
};

const getUnreadNotifications = async (userId) => {
  try {
    const [notifications] = await pool.query(
      `SELECT * FROM notifications 
       WHERE user_id = ? AND is_read = FALSE
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );
    return notifications;
  } catch (error) {
    logger.error('Failed to fetch notifications:', error.message);
    throw error;
  }
};

const markNotificationAsRead = async (notificationId) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ?',
      [notificationId]
    );
  } catch (error) {
    logger.error('Failed to mark notification as read:', error.message);
    throw error;
  }
};

const markAllNotificationsAsRead = async (userId) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );
  } catch (error) {
    logger.error('Failed to mark all notifications as read:', error.message);
    throw error;
  }
};

const deleteNotification = async (notificationId) => {
  try {
    await pool.query(
      'DELETE FROM notifications WHERE id = ?',
      [notificationId]
    );
  } catch (error) {
    logger.error('Failed to delete notification:', error.message);
    throw error;
  }
};

module.exports = {
  createNotification,
  getUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
};
