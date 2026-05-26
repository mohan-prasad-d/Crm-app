// ============================================
// CONTACTS ROUTES (Enhanced)
// ============================================
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validateContact } = require('../utilities/validator');
const { logAudit, logActivity } = require('../utilities/auditLog');
const { createNotification } = require('../utilities/notificationService');
const { getPaginationParams, buildPaginationResponse } = require('../utilities/pagination');
const logger = require('../utilities/logger');

// GET all contacts with pagination and filters
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { search, company } = req.query;
    const { page, limit, offset } = getPaginationParams(req);

    let query = 'SELECT * FROM contacts WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR company LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (company) {
      query += ' AND company = ?';
      params.push(company);
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const [countResult] = await pool.query(countQuery, params);
    const total = countResult[0].total;

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    const [rows] = await pool.query(query, [...params, limit, offset]);

    res.json({
      success: true,
      data: rows
    });
  } catch (e) {
    logger.error('Get contacts failed:', e.message);
    next(e);
  }
});

// GET single contact
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const [contacts] = await pool.query('SELECT * FROM contacts WHERE id = ?', [req.params.id]);
    if (!contacts.length) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    // Get related leads and deals
    const [leads] = await pool.query('SELECT id, name, status FROM leads WHERE company = ?', [contacts[0].company]);
    const [deals] = await pool.query('SELECT id, title, stage FROM deals WHERE contact_name = ?', [contacts[0].name]);

    res.json({
      success: true,
      data: {
        contact: contacts[0],
        related_leads: leads,
        related_deals: deals
      }
    });
  } catch (e) {
    logger.error('Get contact failed:', e.message);
    next(e);
  }
});

// POST create contact
router.post('/', authenticate, authorize('contacts', 'create'), async (req, res, next) => {
  try {
    const { name, email, phone, company, title, address } = req.body;

    const validation = validateContact({ name, email });
    if (!validation.isValid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }

    const [result] = await pool.query(
      'INSERT INTO contacts (name, email, phone, company, title, address, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, phone, company, title, address, req.user.userId]
    );

    await logAudit(req.user.userId, 'CREATE', 'contact', result.insertId, null, { name, email, company }, req);
    await logActivity(req.user.userId, 'Contact', `New contact created: ${name}`, 'contacts', result.insertId);

    res.status(201).json({
      success: true,
      message: 'Contact created successfully',
      data: { id: result.insertId }
    });
  } catch (e) {
    logger.error('Create contact failed:', e.message);
    next(e);
  }
});

// PUT update contact
router.put('/:id', authenticate, authorize('contacts', 'update'), async (req, res, next) => {
  try {
    const { name, email, phone, company, title, address } = req.body;

    const [oldContact] = await pool.query('SELECT * FROM contacts WHERE id = ?', [req.params.id]);
    if (!oldContact.length) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    const [result] = await pool.query(
      'UPDATE contacts SET name=?, email=?, phone=?, company=?, title=?, address=? WHERE id=?',
      [name, email, phone, company, title, address, req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    await logAudit(req.user.userId, 'UPDATE', 'contact', req.params.id, oldContact[0], { name, email, company }, req);
    await logActivity(req.user.userId, 'Contact', `Contact updated: ${name}`, 'contacts', req.params.id);

    res.json({ success: true, message: 'Contact updated successfully' });
  } catch (e) {
    logger.error('Update contact failed:', e.message);
    next(e);
  }
});

// DELETE contact
router.delete('/:id', authenticate, authorize('contacts', 'delete'), async (req, res, next) => {
  try {
    const [contact] = await pool.query('SELECT name FROM contacts WHERE id = ?', [req.params.id]);
    if (!contact.length) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }

    await pool.query('DELETE FROM contacts WHERE id = ?', [req.params.id]);

    await logAudit(req.user.userId, 'DELETE', 'contact', req.params.id, contact[0], null, req);
    await logActivity(req.user.userId, 'Contact', `Contact deleted: ${contact[0].name}`, 'contacts', req.params.id);

    res.json({ success: true, message: 'Contact deleted successfully' });
  } catch (e) {
    logger.error('Delete contact failed:', e.message);
    next(e);
  }
});

module.exports = router;
