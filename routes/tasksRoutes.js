// ============================================
// TASKS ROUTES (Enhanced)
// ============================================
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validateTask } = require('../utilities/validator');
const { logAudit, logActivity } = require('../utilities/auditLog');
const { createNotification } = require('../utilities/notificationService');
const { getPaginationParams, buildPaginationResponse } = require('../utilities/pagination');
const logger = require('../utilities/logger');

// GET all tasks with filters
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, priority, assigned_to, my_tasks, due_soon } = req.query;
    const { page, limit, offset } = getPaginationParams(req);

    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (priority) {
      query += ' AND priority = ?';
      params.push(priority);
    }

    if (assigned_to) {
      query += ' AND assigned_to = ?';
      params.push(assigned_to);
    }

    if (my_tasks === 'true') {
      query += ' AND assigned_to = ?';
      params.push(req.user.userId);
    }

    if (due_soon === 'true') {
      query += ' AND due_date <= DATE_ADD(CURDATE(), INTERVAL 3 DAY) AND due_date >= CURDATE() AND status != "Completed"';
    }

    // Get total
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const [countResult] = await pool.query(countQuery, params);
    const total = countResult[0].total;

    query += ' ORDER BY due_date ASC, priority DESC, created_at DESC LIMIT ? OFFSET ?';
    const [tasks] = await pool.query(query, [...params, limit, offset]);

    res.json({
      success: true,
      data: tasks
    });
  } catch (e) {
    logger.error('Get tasks failed:', e.message);
    next(e);
  }
});

// GET single task
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const [tasks] = await pool.query(
      `SELECT t.*, CONCAT(u.first_name, ' ', u.last_name) as assigned_to_name
       FROM tasks t
       LEFT JOIN users u ON t.assigned_to = u.id
       WHERE t.id = ?`,
      [req.params.id]
    );

    if (!tasks.length) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Get comments
    const [comments] = await pool.query(
      `SELECT c.*, CONCAT(u.first_name, ' ', u.last_name) as user_name 
       FROM comments c 
       JOIN users u ON c.user_id = u.id
       WHERE c.entity_type = ? AND c.entity_id = ?
       ORDER BY c.created_at DESC`,
      ['task', req.params.id]
    );

    res.json({
      success: true,
      data: {
        task: tasks[0],
        comments
      }
    });
  } catch (e) {
    logger.error('Get task failed:', e.message);
    next(e);
  }
});

// POST create task
router.post('/', authenticate, authorize('tasks', 'create'), async (req, res, next) => {
  try {
    const { title, description, due_date, priority, status, related_to, related_id, assigned_to } = req.body;

    const validation = validateTask({ title });
    if (!validation.isValid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }

    const formattedDate = due_date && due_date.includes('T') ? due_date.split('T')[0] : due_date;

    const [result] = await pool.query(
      `INSERT INTO tasks 
       (title, description, due_date, priority, status, related_to, related_id, assigned_to, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description, formattedDate || null, priority || 'Medium', status || 'Pending', related_to, related_id || null, assigned_to || null, req.user.userId]
    );

    const taskId = result.insertId;

    await logAudit(req.user.userId, 'CREATE', 'task', taskId, null, { title, priority, status }, req);
    await logActivity(req.user.userId, 'Task', `Task created: ${title}`, 'tasks', taskId);

    // Notify if assigned
    if (assigned_to) {
      const [user] = await pool.query('SELECT first_name, email FROM users WHERE id = ?', [assigned_to]);
      if (user.length > 0) {
        await createNotification(
          assigned_to,
          'task_deadline',
          'New Task Assigned',
          `Task "${title}" has been assigned to you${formattedDate ? ` (Due: ${formattedDate})` : ''}`,
          'task',
          taskId,
          process.env.SEND_EMAIL_NOTIFICATIONS === 'true'
        );
      }
    }

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: { id: taskId }
    });
  } catch (e) {
    logger.error('Create task failed:', e.message);
    next(e);
  }
});

// PUT update task
router.put('/:id', authenticate, authorize('tasks', 'update'), async (req, res, next) => {
  try {
    const { title, description, due_date, priority, status, related_to, assigned_to } = req.body;

    const [oldTask] = await pool.query('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (!oldTask.length) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const formattedDate = due_date && due_date.includes('T') ? due_date.split('T')[0] : due_date;

    const [result] = await pool.query(
      `UPDATE tasks 
       SET title=?, description=?, due_date=?, priority=?, status=?, related_to=?, assigned_to=?
       WHERE id=?`,
      [title, description, formattedDate || null, priority, status, related_to, assigned_to, req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    await logAudit(req.user.userId, 'UPDATE', 'task', req.params.id, oldTask[0], { title, status, assigned_to }, req);
    await logActivity(req.user.userId, 'Task', `Task updated: ${title}`, 'tasks', req.params.id);

    res.json({ success: true, message: 'Task updated successfully' });
  } catch (e) {
    logger.error('Update task failed:', e.message);
    next(e);
  }
});

// DELETE task
router.delete('/:id', authenticate, authorize('tasks', 'delete'), async (req, res, next) => {
  try {
    const [task] = await pool.query('SELECT title FROM tasks WHERE id = ?', [req.params.id]);
    if (!task.length) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    await pool.query('DELETE FROM tasks WHERE id = ?', [req.params.id]);

    await logAudit(req.user.userId, 'DELETE', 'task', req.params.id, task[0], null, req);
    await logActivity(req.user.userId, 'Task', `Task deleted: ${task[0].title}`, 'tasks', req.params.id);

    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (e) {
    logger.error('Delete task failed:', e.message);
    next(e);
  }
});

module.exports = router;
