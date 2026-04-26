// ============================================
// LEADS ROUTES
// ============================================
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET all leads (with search + status filter)
router.get('/', async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = 'SELECT * FROM leads WHERE 1=1';
    const params = [];
    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR company LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) { query += ' AND status = ?'; params.push(status); }
    query += ' ORDER BY created_at DESC';
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET single lead
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM leads WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: rows[0] });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST create lead + log activity
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, company, source, status, notes } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
    const [result] = await pool.query(
      'INSERT INTO leads (name,email,phone,company,source,status,notes) VALUES (?,?,?,?,?,?,?)',
      [name, email, phone, company, source || 'Other', status || 'New', notes]
    );
    await pool.query(
      'INSERT INTO activities (type,description,module,module_id) VALUES (?,?,?,?)',
      ['Note', `New lead added: ${name}`, 'leads', result.insertId]
    );
    res.status(201).json({ success: true, message: 'Lead added!', data: { id: result.insertId } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// PUT update lead
router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone, company, source, status, notes } = req.body;
    const [result] = await pool.query(
      'UPDATE leads SET name=?,email=?,phone=?,company=?,source=?,status=?,notes=? WHERE id=?',
      [name, email, phone, company, source, status, notes, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Not found' });
    await pool.query(
      'INSERT INTO activities (type,description,module,module_id) VALUES (?,?,?,?)',
      ['Note', `Lead updated: ${name}`, 'leads', req.params.id]
    );
    res.json({ success: true, message: 'Lead updated!' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// DELETE lead
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM leads WHERE id=?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Lead deleted!' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
