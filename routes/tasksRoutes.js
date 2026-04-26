// ============================================
// TASKS ROUTES
// ============================================
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const { status, priority } = req.query;
    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params = [];
    if (status) { query += ' AND status=?'; params.push(status); }
    if (priority) { query += ' AND priority=?'; params.push(priority); }
    query += ' ORDER BY due_date ASC, created_at DESC';
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM tasks WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: rows[0] });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, description, due_date, priority, status, related_to } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title required' });
    const [result] = await pool.query(
      'INSERT INTO tasks (title,description,due_date,priority,status,related_to) VALUES (?,?,?,?,?,?)',
      [title, description, due_date || null, priority || 'Medium', status || 'Pending', related_to]
    );
    await pool.query(
      'INSERT INTO activities (type,description,module,module_id) VALUES (?,?,?,?)',
      ['Task', `Task created: ${title}`, 'tasks', result.insertId]
    );
    res.status(201).json({ success: true, message: 'Task created!', data: { id: result.insertId } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, description, due_date, priority, status, related_to } = req.body;
    const [result] = await pool.query(
      'UPDATE tasks SET title=?,description=?,due_date=?,priority=?,status=?,related_to=? WHERE id=?',
      [title, description, due_date || null, priority, status, related_to, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Task updated!' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM tasks WHERE id=?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Task deleted!' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
