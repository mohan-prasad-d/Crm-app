// ============================================
// NOTIFICATIONS ROUTES
// ============================================
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getUnreadNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } = require('../utilities/notificationService');
const pool = require('../config/db');
const logger = require('../utilities/logger');

// Get all notifications for current user
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { unread_only } = req.query;

    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    const params = [req.user.userId];

    if (unread_only === 'true') {
      query += ' AND is_read = FALSE';
    }

    query += ' ORDER BY created_at DESC LIMIT 100';

    const [notifications] = await pool.query(query, params);

    res.json({
      success: true,
      data: notifications,
      unread_count: notifications.filter(n => !n.is_read).length
    });
  } catch (error) {
    logger.error('Get notifications failed:', error.message);
    next(error);
  }
});

// Get unread count
router.get('/unread/count', authenticate, async (req, res, next) => {
  try {
    const [result] = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [req.user.userId]
    );

    res.json({
      success: true,
      unread_count: result[0].count
    });
  } catch (error) {
    logger.error('Get unread count failed:', error.message);
    next(error);
  }
});

// Mark all as read (MUST come before /:id routes to avoid pattern matching)
router.put('/all/read', authenticate, async (req, res, next) => {
  try {
    await markAllNotificationsAsRead(req.user.userId);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    logger.error('Mark all as read failed:', error.message);
    next(error);
  }
});

// Mark notification as read
router.put('/:id/read', authenticate, async (req, res, next) => {
  try {
    await markNotificationAsRead(req.params.id);
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    logger.error('Mark notification as read failed:', error.message);
    next(error);
  }
});

// Delete notification
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await deleteNotification(req.params.id);
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    logger.error('Delete notification failed:', error.message);
    next(error);
  }
});

module.exports = router;
