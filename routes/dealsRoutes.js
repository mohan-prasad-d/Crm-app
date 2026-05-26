// ============================================
// DEALS ROUTES (Enhanced with Kanban/Pipeline)
// ============================================
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validateDeal } = require('../utilities/validator');
const { logAudit, logActivity } = require('../utilities/auditLog');
const { createNotification } = require('../utilities/notificationService');
const { getPaginationParams, buildPaginationResponse } = require('../utilities/pagination');
const logger = require('../utilities/logger');

// ============================================
// IMPORTANT: MORE SPECIFIC ROUTES FIRST
// ============================================

// GET deals grouped by stage (Kanban board) - MUST BE BEFORE /:id
router.get('/kanban/board', authenticate, async (req, res, next) => {
  try {
    const stages = ['Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost'];
    const kanban = {};

    for (const stage of stages) {
      try {
        const [deals] = await pool.query(
          `SELECT d.*, CONCAT(u.first_name, ' ', u.last_name) as assigned_to_name
           FROM deals d
           LEFT JOIN users u ON d.assigned_to = u.id
           WHERE d.stage = ?
           ORDER BY d.updated_at DESC`,
          [stage]
        );

        kanban[stage] = {
          deals: deals || [],
          count: (deals || []).length,
          total_value: (deals || []).reduce((sum, d) => sum + (parseFloat(d.value) || 0), 0)
        };
      } catch (stageErr) {
        logger.warn(`Kanban stage ${stage} query failed:`, stageErr.message);
        kanban[stage] = { deals: [], count: 0, total_value: 0 };
      }
    }

    res.json({
      success: true,
      data: kanban
    });
  } catch (error) {
    logger.error('Get kanban board failed:', error.message);
    next(error);
  }
});

// GET all deals (LIST VIEW)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { stage, assigned_to, my_deals } = req.query;
    const { page, limit, offset } = getPaginationParams(req);

    let query = 'SELECT * FROM deals WHERE 1=1';
    const params = [];

    if (stage) {
      query += ' AND stage = ?';
      params.push(stage);
    }

    if (assigned_to) {
      query += ' AND assigned_to = ?';
      params.push(assigned_to);
    }

    if (my_deals === 'true') {
      query += ' AND assigned_to = ?';
      params.push(req.user.userId);
    }

    // Get total
    try {
      const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
      const [countResult] = await pool.query(countQuery, params);
      const total = (countResult && countResult[0]) ? countResult[0].total : 0;

      query += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
      const [deals] = await pool.query(query, [...params, limit, offset]);

      res.json({
        success: true,
        data: deals || []
      });
    } catch (countErr) {
      logger.error('Count deals query failed:', countErr.message);
      res.json({
        success: true,
        data: []
      });
    }
  } catch (e) {
    logger.error('Get deals failed:', e.message);
    next(e);
  }
});

// GET single deal
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const [deals] = await pool.query(
      `SELECT d.*, CONCAT(u.first_name, ' ', u.last_name) as assigned_to_name
       FROM deals d
       LEFT JOIN users u ON d.assigned_to = u.id
       WHERE d.id = ?`,
      [req.params.id]
    );

    if (!deals.length) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }

    // Get comments
    const [comments] = await pool.query(
      `SELECT c.*, CONCAT(u.first_name, ' ', u.last_name) as user_name 
       FROM comments c 
       JOIN users u ON c.user_id = u.id
       WHERE c.entity_type = ? AND c.entity_id = ?
       ORDER BY c.created_at DESC`,
      ['deal', req.params.id]
    );

    // Get attachments
    const [attachments] = await pool.query(
      'SELECT * FROM attachments WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC',
      ['deal', req.params.id]
    );

    res.json({
      success: true,
      data: {
        deal: deals[0],
        comments,
        attachments
      }
    });
  } catch (e) {
    logger.error('Get deal failed:', e.message);
    next(e);
  }
});

// POST create deal
router.post('/', authenticate, authorize('deals', 'create'), async (req, res, next) => {
  try {
    const { title, contact_name, lead_id, value, stage, close_date, probability, assigned_to } = req.body;

    const validation = validateDeal({ title, value });
    if (!validation.isValid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }

    const formattedDate = close_date && close_date.includes('T') ? close_date.split('T')[0] : close_date;

    const [result] = await pool.query(
      `INSERT INTO deals 
       (title, contact_name, lead_id, value, stage, close_date, probability, assigned_to, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, contact_name, lead_id || null, value || 0, stage || 'Qualification', formattedDate || null, probability || 20, assigned_to || null, req.user.userId]
    );

    const dealId = result.insertId;

    await logAudit(req.user.userId, 'CREATE', 'deal', dealId, null, { title, value, stage }, req);
    await logActivity(req.user.userId, 'Deal', `New deal created: ${title} (₹${value || 0})`, 'deals', dealId);

    // Notify if assigned
    if (assigned_to) {
      const [user] = await pool.query('SELECT first_name, email FROM users WHERE id = ?', [assigned_to]);
      if (user.length > 0) {
        await createNotification(
          assigned_to,
          'deal_updated',
          'New Deal Created',
          `Deal "${title}" has been created and assigned to you`,
          'deal',
          dealId,
          process.env.SEND_EMAIL_NOTIFICATIONS === 'true'
        );
      }
    }

    res.status(201).json({
      success: true,
      message: 'Deal created successfully',
      data: { id: dealId }
    });
  } catch (e) {
    logger.error('Create deal failed:', e.message);
    next(e);
  }
});

// PUT update deal
router.put('/:id', authenticate, authorize('deals', 'update'), async (req, res, next) => {
  try {
    const { title, contact_name, value, stage, close_date, probability, assigned_to } = req.body;

    const [oldDeal] = await pool.query('SELECT * FROM deals WHERE id = ?', [req.params.id]);
    if (!oldDeal.length) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }

    const formattedDate = close_date && close_date.includes('T') ? close_date.split('T')[0] : close_date;

    const [result] = await pool.query(
      `UPDATE deals 
       SET title=?, contact_name=?, value=?, stage=?, close_date=?, probability=?, assigned_to=?
       WHERE id=?`,
      [title, contact_name, value, stage, formattedDate || null, probability, assigned_to, req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }

    await logAudit(req.user.userId, 'UPDATE', 'deal', req.params.id, oldDeal[0], { title, value, stage }, req);
    await logActivity(req.user.userId, 'Deal', `Deal updated: ${title} → ${stage}`, 'deals', req.params.id);

    // Notify on stage change
    if (stage !== oldDeal[0].stage) {
      const [assignee] = await pool.query('SELECT first_name, email FROM users WHERE id = ?', [assigned_to]);
      if (assignee.length > 0) {
        await createNotification(
          assigned_to,
          'deal_updated',
          'Deal Status Updated',
          `Deal "${title}" moved to ${stage}`,
          'deal',
          req.params.id,
          process.env.SEND_EMAIL_NOTIFICATIONS === 'true'
        );
      }
    }

    res.json({ success: true, message: 'Deal updated successfully' });
  } catch (e) {
    logger.error('Update deal failed:', e.message);
    next(e);
  }
});

// PATCH move deal (drag-drop Kanban)
router.patch('/:id/move', authenticate, authorize('deals', 'update'), async (req, res, next) => {
  try {
    const { stage } = req.body;

    if (!stage) {
      return res.status(400).json({ success: false, message: 'Stage is required' });
    }

    const validStages = ['Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost'];
    if (!validStages.includes(stage)) {
      return res.status(400).json({ success: false, message: 'Invalid stage' });
    }

    const [deal] = await pool.query('SELECT * FROM deals WHERE id = ?', [req.params.id]);
    if (!deal.length) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }

    await pool.query('UPDATE deals SET stage = ?, updated_at = NOW() WHERE id = ?', [stage, req.params.id]);

    await logActivity(req.user.userId, 'Deal', `Deal moved to ${stage}`, 'deals', req.params.id);

    res.json({ success: true, message: 'Deal moved successfully' });
  } catch (error) {
    logger.error('Move deal failed:', error.message);
    next(error);
  }
});

// DELETE deal
router.delete('/:id', authenticate, authorize('deals', 'delete'), async (req, res, next) => {
  try {
    const [deal] = await pool.query('SELECT title FROM deals WHERE id = ?', [req.params.id]);
    if (!deal.length) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }

    await pool.query('DELETE FROM deals WHERE id = ?', [req.params.id]);

    await logAudit(req.user.userId, 'DELETE', 'deal', req.params.id, deal[0], null, req);
    await logActivity(req.user.userId, 'Deal', `Deal deleted: ${deal[0].title}`, 'deals', req.params.id);

    res.json({ success: true, message: 'Deal deleted successfully' });
  } catch (e) {
    logger.error('Delete deal failed:', e.message);
    next(e);
  }
});

module.exports = router;
