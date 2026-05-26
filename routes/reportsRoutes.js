// ============================================
// REPORTS & EXPORT ROUTES
// ============================================
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { generateLeadsReport, generateContactsReport, generateDealsReport } = require('../utilities/csvExport');
const logger = require('../utilities/logger');
const path = require('path');
const fs = require('fs');

// Get leads report
router.get('/export/leads', authenticate, authorize('reports', 'export'), async (req, res, next) => {
  try {
    const { status, date_from, date_to } = req.query;

    let query = 'SELECT id, name, email, phone, company, source, status, created_at FROM leads WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (date_from) {
      query += ' AND created_at >= ?';
      params.push(date_from);
    }

    if (date_to) {
      query += ' AND created_at <= ?';
      params.push(date_to + ' 23:59:59');
    }

    const [leads] = await pool.query(query, params);

    const filepath = await generateLeadsReport(leads);
    res.download(filepath, 'leads_report.csv', (err) => {
      if (err) logger.error('Error sending file:', err.message);
      // Clean up temp file
      fs.unlink(filepath, (unlinkErr) => {
        if (unlinkErr) logger.error('Error deleting temp file:', unlinkErr.message);
      });
    });
  } catch (error) {
    logger.error('Export leads failed:', error.message);
    next(error);
  }
});

// Get contacts report
router.get('/export/contacts', authenticate, authorize('reports', 'export'), async (req, res, next) => {
  try {
    const [contacts] = await pool.query(
      'SELECT id, name, email, phone, company, title, created_at FROM contacts ORDER BY created_at DESC'
    );

    const filepath = await generateContactsReport(contacts);
    res.download(filepath, 'contacts_report.csv', (err) => {
      if (err) logger.error('Error sending file:', err.message);
      fs.unlink(filepath, (unlinkErr) => {
        if (unlinkErr) logger.error('Error deleting temp file:', unlinkErr.message);
      });
    });
  } catch (error) {
    logger.error('Export contacts failed:', error.message);
    next(error);
  }
});

// Get deals report
router.get('/export/deals', authenticate, authorize('reports', 'export'), async (req, res, next) => {
  try {
    const { stage, date_from, date_to } = req.query;

    let query = 'SELECT id, title, value, stage, probability, close_date, created_at FROM deals WHERE 1=1';
    const params = [];

    if (stage) {
      query += ' AND stage = ?';
      params.push(stage);
    }

    if (date_from) {
      query += ' AND created_at >= ?';
      params.push(date_from);
    }

    if (date_to) {
      query += ' AND created_at <= ?';
      params.push(date_to + ' 23:59:59');
    }

    const [deals] = await pool.query(query, params);

    const filepath = await generateDealsReport(deals);
    res.download(filepath, 'deals_report.csv', (err) => {
      if (err) logger.error('Error sending file:', err.message);
      fs.unlink(filepath, (unlinkErr) => {
        if (unlinkErr) logger.error('Error deleting temp file:', unlinkErr.message);
      });
    });
  } catch (error) {
    logger.error('Export deals failed:', error.message);
    next(error);
  }
});

// Get monthly leads report
router.get('/monthly/leads', authenticate, authorize('reports', 'read'), async (req, res, next) => {
  try {
    const [report] = await pool.query(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as total_leads,
        SUM(CASE WHEN status = 'Won' THEN 1 ELSE 0 END) as won_leads,
        SUM(CASE WHEN status = 'Lost' THEN 1 ELSE 0 END) as lost_leads
      FROM leads
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month DESC
      LIMIT 12
    `);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Get monthly leads report failed:', error.message);
    next(error);
  }
});

// Get deals summary
router.get('/deals/summary', authenticate, authorize('reports', 'read'), async (req, res, next) => {
  try {
    const [summary] = await pool.query(`
      SELECT 
        stage,
        COUNT(*) as count,
        SUM(value) as total_value,
        AVG(probability) as avg_probability
      FROM deals
      GROUP BY stage
      ORDER BY FIELD(stage, 'Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost')
    `);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    logger.error('Get deals summary failed:', error.message);
    next(error);
  }
});

// Get top performing users
router.get('/users/performance', authenticate, authorize('reports', 'read'), async (req, res, next) => {
  try {
    const [report] = await pool.query(`
      SELECT 
        u.id,
        CONCAT(u.first_name, ' ', u.last_name) as name,
        COUNT(DISTINCT l.id) as leads_created,
        COUNT(DISTINCT d.id) as deals_created,
        SUM(d.value) as total_deal_value
      FROM users u
      LEFT JOIN leads l ON u.id = l.created_by
      LEFT JOIN deals d ON u.id = d.created_by
      WHERE u.is_active = TRUE
      GROUP BY u.id, u.first_name, u.last_name
      ORDER BY total_deal_value DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Get user performance failed:', error.message);
    next(error);
  }
});

module.exports = router;
