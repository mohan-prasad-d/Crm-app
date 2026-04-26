// ============================================
// DEALS ROUTES (Pipeline/Kanban)
// ============================================
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const { stage } = req.query;
    let query = 'SELECT * FROM deals WHERE 1=1';
    const params = [];
    if (stage) { query += ' AND stage=?'; params.push(stage); }
    query += ' ORDER BY created_at DESC';
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM deals WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: rows[0] });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, contact_name, value, stage, close_date, probability } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title required' });
    const [result] = await pool.query(
      'INSERT INTO deals (title,contact_name,value,stage,close_date,probability) VALUES (?,?,?,?,?,?)',
      [title, contact_name, value || 0, stage || 'Qualification', close_date || null, probability || 20]
    );
    await pool.query(
      'INSERT INTO activities (type,description,module,module_id) VALUES (?,?,?,?)',
      ['Note', `New deal created: ${title} (₹${value || 0})`, 'deals', result.insertId]
    );
    res.status(201).json({ success: true, message: 'Deal created!', data: { id: result.insertId } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, contact_name, value, stage, close_date, probability } = req.body;
    const [result] = await pool.query(
      'UPDATE deals SET title=?,contact_name=?,value=?,stage=?,close_date=?,probability=? WHERE id=?',
      [title, contact_name, value, stage, close_date || null, probability, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Not found' });
    await pool.query(
      'INSERT INTO activities (type,description,module,module_id) VALUES (?,?,?,?)',
      ['Note', `Deal updated: ${title} → ${stage}`, 'deals', req.params.id]
    );
    res.json({ success: true, message: 'Deal updated!' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM deals WHERE id=?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deal deleted!' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
