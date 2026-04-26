// ============================================
// CONTACTS ROUTES
// ============================================
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM contacts WHERE 1=1';
    const params = [];
    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR company LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    query += ' ORDER BY created_at DESC';
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM contacts WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: rows[0] });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, email, phone, company, title, address } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name required' });
    const [result] = await pool.query(
      'INSERT INTO contacts (name,email,phone,company,title,address) VALUES (?,?,?,?,?,?)',
      [name, email, phone, company, title, address]
    );
    await pool.query(
      'INSERT INTO activities (type,description,module,module_id) VALUES (?,?,?,?)',
      ['Note', `New contact added: ${name}`, 'contacts', result.insertId]
    );
    res.status(201).json({ success: true, message: 'Contact added!', data: { id: result.insertId } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone, company, title, address } = req.body;
    const [result] = await pool.query(
      'UPDATE contacts SET name=?,email=?,phone=?,company=?,title=?,address=? WHERE id=?',
      [name, email, phone, company, title, address, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Contact updated!' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM contacts WHERE id=?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Contact deleted!' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
