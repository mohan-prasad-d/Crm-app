// ============================================
// LEADS ROUTES (Enhanced)
// ============================================
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validateLead } = require('../utilities/validator');
const { logAudit, logActivity } = require('../utilities/auditLog');
const { createNotification } = require('../utilities/notificationService');
const { getPaginationParams, buildPaginationResponse, addPaginationToQuery, getPaginationValues } = require('../utilities/pagination');
const logger = require('../utilities/logger');

// GET all leads with pagination, search, filters, assignment
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { search, status, source, assigned_to, date_from, date_to, my_leads } = req.query;
    const { page, limit, offset } = getPaginationParams(req);

    let query = 'SELECT * FROM leads WHERE 1=1';
    const params = [];

    // Multi-field search
    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR company LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Status filter
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    // Source filter
    if (source) {
      query += ' AND source = ?';
      params.push(source);
    }

    // Assigned user filter
    if (assigned_to) {
      query += ' AND assigned_to = ?';
      params.push(assigned_to);
    }

    // My leads - only show leads assigned to current user
    if (my_leads === 'true') {
      query += ' AND assigned_to = ?';
      params.push(req.user.userId);
    }

    // Date range filter
    if (date_from) {
      query += ' AND created_at >= ?';
      params.push(date_from);
    }
    if (date_to) {
      query += ' AND created_at <= ?';
      params.push(date_to + ' 23:59:59');
    }

    // Get total count
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM (SELECT 1 FROM leads WHERE 1=1 ${query.substring(30)}) as cnt`,
      params
    );
    const total = countResult[0].total;

    // Add pagination
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const [rows] = await pool.query(query, [...params, limit, offset]);

    res.json({
      success: true,
      data: rows
    });
  } catch (e) {
    logger.error('Get leads failed:', e.message);
    next(e);
  }
});

// GET single lead with details
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const [leads] = await pool.query(
      `SELECT l.*, 
              CONCAT(u.first_name, ' ', u.last_name) as assigned_to_name,
              COUNT(c.id) as comment_count
       FROM leads l
       LEFT JOIN users u ON l.assigned_to = u.id
       LEFT JOIN comments c ON c.entity_type = 'lead' AND c.entity_id = l.id
       WHERE l.id = ?
       GROUP BY l.id`,
      [req.params.id]
    );

    if (!leads.length) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Get attachments
    const [attachments] = await pool.query(
      'SELECT * FROM attachments WHERE entity_type = ? AND entity_id = ?',
      ['lead', req.params.id]
    );

    // Get comments
    const [comments] = await pool.query(
      `SELECT c.*, CONCAT(u.first_name, ' ', u.last_name) as user_name 
       FROM comments c 
       JOIN users u ON c.user_id = u.id
       WHERE c.entity_type = ? AND c.entity_id = ?
       ORDER BY c.created_at DESC`,
      ['lead', req.params.id]
    );

    // Get activities
    const [activities] = await pool.query(
      `SELECT a.*, CONCAT(u.first_name, ' ', u.last_name) as user_name
       FROM activities a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.module = ? AND a.module_id = ?
       ORDER BY a.created_at DESC LIMIT 20`,
      ['leads', req.params.id]
    );

    res.json({
      success: true,
      data: {
        lead: leads[0],
        attachments,
        comments,
        activities
      }
    });
  } catch (e) {
    logger.error('Get lead details failed:', e.message);
    next(e);
  }
});

// POST create lead
router.post('/', authenticate, authorize('leads', 'create'), async (req, res, next) => {
  try {
    const { name, email, phone, company, source, status, notes, assigned_to } = req.body;

    const validation = validateLead({ name, email, phone });
    if (!validation.isValid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }

    const [result] = await pool.query(
      `INSERT INTO leads 
       (name, email, phone, company, source, status, notes, assigned_to, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email, phone, company, source || 'Other', status || 'New', notes, assigned_to || null, req.user.userId]
    );

    const leadId = result.insertId;

    // Log audit
    await logAudit(req.user.userId, 'CREATE', 'lead', leadId, null, { name, email, company, status }, req);

    // Log activity
    await logActivity(req.user.userId, 'Lead', `New lead created: ${name}`, 'leads', leadId);

    // Create notification if assigned
    if (assigned_to) {
      const [assignee] = await pool.query(
        'SELECT first_name, email FROM users WHERE id = ?',
        [assigned_to]
      );

      if (assignee.length > 0) {
        await createNotification(
          assigned_to,
          'lead_assigned',
          'New Lead Assigned',
          `Lead "${name}" has been assigned to you`,
          'lead',
          leadId,
          process.env.SEND_EMAIL_NOTIFICATIONS === 'true'
        );
      }
    }

    res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      data: { id: leadId }
    });
  } catch (e) {
    logger.error('Create lead failed:', e.message);
    next(e);
  }
});

// PUT update lead
router.put('/:id', authenticate, authorize('leads', 'update'), async (req, res, next) => {
  try {
    const { name, email, phone, company, source, status, notes, assigned_to } = req.body;

    // Get old values for audit
    const [oldLead] = await pool.query('SELECT * FROM leads WHERE id = ?', [req.params.id]);
    if (!oldLead.length) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const [result] = await pool.query(
      `UPDATE leads 
       SET name=?, email=?, phone=?, company=?, source=?, status=?, notes=?, assigned_to=?
       WHERE id=?`,
      [name, email, phone, company, source, status, notes, assigned_to, req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Log audit
    await logAudit(
      req.user.userId,
      'UPDATE',
      'lead',
      req.params.id,
      oldLead[0],
      { name, email, company, status, assigned_to },
      req
    );

    // Log activity
    await logActivity(req.user.userId, 'Lead', `Lead updated: ${name}`, 'leads', req.params.id);

    // Notify if assignment changed
    if (assigned_to && assigned_to !== oldLead[0].assigned_to) {
      const [assignee] = await pool.query(
        'SELECT first_name, email FROM users WHERE id = ?',
        [assigned_to]
      );

      if (assignee.length > 0) {
        await createNotification(
          assigned_to,
          'lead_assigned',
          'Lead Reassigned',
          `Lead "${name}" has been reassigned to you`,
          'lead',
          req.params.id,
          process.env.SEND_EMAIL_NOTIFICATIONS === 'true'
        );
      }
    }

    res.json({ success: true, message: 'Lead updated successfully' });
  } catch (e) {
    logger.error('Update lead failed:', e.message);
    next(e);
  }
});

// DELETE lead
router.delete('/:id', authenticate, authorize('leads', 'delete'), async (req, res, next) => {
  try {
    const [lead] = await pool.query('SELECT name FROM leads WHERE id = ?', [req.params.id]);
    if (!lead.length) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const [result] = await pool.query('DELETE FROM leads WHERE id=?', [req.params.id]);

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Log audit
    await logAudit(req.user.userId, 'DELETE', 'lead', req.params.id, lead[0], null, req);

    // Log activity
    await logActivity(req.user.userId, 'Lead', `Lead deleted: ${lead[0].name}`, 'leads', req.params.id);

    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (e) {
    logger.error('Delete lead failed:', e.message);
    next(e);
  }
});

// Assign lead to user
router.put('/:id/assign', authenticate, authorize('leads', 'assign'), async (req, res, next) => {
  try {
    const { assigned_to } = req.body;

    if (!assigned_to) {
      return res.status(400).json({ success: false, message: 'Assigned user ID required' });
    }

    const [lead] = await pool.query('SELECT * FROM leads WHERE id = ?', [req.params.id]);
    if (!lead.length) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    await pool.query('UPDATE leads SET assigned_to = ? WHERE id = ?', [assigned_to, req.params.id]);

    // Log assignment
    await pool.query(
      `INSERT INTO lead_assignments (lead_id, assigned_to, assigned_by, assigned_at)
       VALUES (?, ?, ?, NOW())`,
      [req.params.id, assigned_to, req.user.userId]
    );

    // Notify assignee
    const [user] = await pool.query(
      'SELECT first_name, email FROM users WHERE id = ?',
      [assigned_to]
    );

    if (user.length > 0) {
      await createNotification(
        assigned_to,
        'lead_assigned',
        'New Lead Assigned',
        `Lead "${lead[0].name}" has been assigned to you`,
        'lead',
        req.params.id,
        process.env.SEND_EMAIL_NOTIFICATIONS === 'true'
      );
    }

    res.json({ success: true, message: 'Lead assigned successfully' });
  } catch (e) {
    logger.error('Assign lead failed:', e.message);
    next(e);
  }
});

module.exports = router;
