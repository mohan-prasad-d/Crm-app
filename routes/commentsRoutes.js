// ============================================
// COMMENTS ROUTES - Collaboration
// ============================================
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { logActivity } = require('../utilities/auditLog');
const logger = require('../utilities/logger');

// Get comments for an entity (lead, contact, deal, task)
router.get('/:entity_type/:entity_id', authenticate, async (req, res, next) => {
  try {
    const { entity_type, entity_id } = req.params;

    const [comments] = await pool.query(
      `SELECT c.*, 
              CONCAT(u.first_name, ' ', u.last_name) as user_name,
              u.id as user_id
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.entity_type = ? AND c.entity_id = ?
       ORDER BY c.created_at DESC`,
      [entity_type, entity_id]
    );

    res.json({
      success: true,
      data: comments
    });
  } catch (error) {
    logger.error('Get comments failed:', error.message);
    next(error);
  }
});

// Create comment
router.post('/:entity_type/:entity_id', authenticate, async (req, res, next) => {
  try {
    const { entity_type, entity_id } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Comment content required' });
    }

    const [result] = await pool.query(
      `INSERT INTO comments (entity_type, entity_id, user_id, content, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [entity_type, entity_id, req.user.userId, content]
    );

    // Log activity
    await logActivity(
      req.user.userId,
      'Comment',
      `Comment added on ${entity_type}`,
      entity_type,
      entity_id
    );

    // Get the created comment with user info
    const [comments] = await pool.query(
      `SELECT c.*, CONCAT(u.first_name, ' ', u.last_name) as user_name
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Comment added',
      data: comments[0]
    });
  } catch (error) {
    logger.error('Create comment failed:', error.message);
    next(error);
  }
});

// Update comment (only own comments)
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Comment content required' });
    }

    // Verify ownership
    const [comments] = await pool.query(
      'SELECT * FROM comments WHERE id = ?',
      [req.params.id]
    );

    if (!comments.length) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    if (comments[0].user_id !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Cannot modify other users\' comments' });
    }

    await pool.query(
      'UPDATE comments SET content = ?, updated_at = NOW() WHERE id = ?',
      [content, req.params.id]
    );

    res.json({ success: true, message: 'Comment updated' });
  } catch (error) {
    logger.error('Update comment failed:', error.message);
    next(error);
  }
});

// Delete comment (only own comments)
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    // Verify ownership
    const [comments] = await pool.query(
      'SELECT * FROM comments WHERE id = ?',
      [req.params.id]
    );

    if (!comments.length) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    if (comments[0].user_id !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Cannot delete other users\' comments' });
    }

    await pool.query('DELETE FROM comments WHERE id = ?', [req.params.id]);

    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    logger.error('Delete comment failed:', error.message);
    next(error);
  }
});

module.exports = router;
