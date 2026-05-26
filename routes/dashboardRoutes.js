// ============================================
// DASHBOARD STATS ROUTE (Enhanced)
// ============================================
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { logActivity } = require('../utilities/auditLog');
const logger = require('../utilities/logger');

router.get('/', authenticate, async (req, res, next) => {
  try {
    // Counts
    const [[{ totalLeads }]] = await pool.query('SELECT COUNT(*) as totalLeads FROM leads');
    const [[{ totalContacts }]] = await pool.query('SELECT COUNT(*) as totalContacts FROM contacts');
    const [[{ totalDeals }]] = await pool.query('SELECT COUNT(*) as totalDeals FROM deals');
    const [[{ pendingTasks }]] = await pool.query("SELECT COUNT(*) as pendingTasks FROM tasks WHERE status != 'Completed'");
    const [[{ totalUsers }]] = await pool.query('SELECT COUNT(*) as totalUsers FROM users WHERE is_active = TRUE');

    // Revenue analytics
    const [[{ totalRevenue }]] = await pool.query("SELECT IFNULL(SUM(value),0) as totalRevenue FROM deals WHERE stage='Won'");
    const [[{ monthlyRevenue }]] = await pool.query(
      "SELECT IFNULL(SUM(value),0) as monthlyRevenue FROM deals WHERE stage='Won' AND MONTH(close_date)=MONTH(NOW()) AND YEAR(close_date)=YEAR(NOW())"
    );

    // Pipeline value (all open deals)
    const [[{ pipelineValue }]] = await pool.query("SELECT IFNULL(SUM(value),0) as pipelineValue FROM deals WHERE stage NOT IN ('Won','Lost')");

    // Conversion rate
    const [[{ totalLeadsThisMonth }]] = await pool.query("SELECT COUNT(*) as totalLeadsThisMonth FROM leads WHERE MONTH(created_at)=MONTH(NOW()) AND YEAR(created_at)=YEAR(NOW())");
    const [[{ dealsClosedThisMonth }]] = await pool.query("SELECT COUNT(*) as dealsClosedThisMonth FROM deals WHERE stage='Won' AND MONTH(close_date)=MONTH(NOW()) AND YEAR(close_date)=YEAR(NOW())");
    const conversionRate = totalLeadsThisMonth > 0 ? ((dealsClosedThisMonth / totalLeadsThisMonth) * 100).toFixed(2) : 0;

    // Lead status breakdown
    const [leadsByStatus] = await pool.query('SELECT status, COUNT(*) as count FROM leads GROUP BY status ORDER BY count DESC');

    // Deals by stage
    const [dealsByStage] = await pool.query('SELECT stage, COUNT(*) as count, IFNULL(SUM(value),0) as value FROM deals GROUP BY stage ORDER BY count DESC');

    // Recent activities (safe fallback)
    let activities = [];
    try {
      const [result] = await pool.query(`
        SELECT a.*, CONCAT(u.first_name, ' ', u.last_name) as user_name
        FROM activities a
        LEFT JOIN users u ON a.user_id = u.id
        ORDER BY a.created_at DESC 
        LIMIT 20
      `);
      activities = result || [];
    } catch (err) {
      logger.warn('Activities table issue:', err.message);
      // Activities table may not exist yet, continue without it
    }

    // Tasks due today
    let tasksDueToday = [];
    try {
      const [result] = await pool.query(
        `SELECT t.*, CONCAT(u.first_name, ' ', u.last_name) as assigned_to_name 
         FROM tasks t 
         LEFT JOIN users u ON t.assigned_to = u.id
         WHERE DATE(t.due_date)=CURDATE() AND t.status!='Completed' 
         LIMIT 10`
      );
      tasksDueToday = result || [];
    } catch (err) {
      logger.warn('Tasks query issue:', err.message);
    }

    // Overdue tasks
    let overdueTasks = [];
    try {
      const [result] = await pool.query(
        `SELECT t.*, CONCAT(u.first_name, ' ', u.last_name) as assigned_to_name 
         FROM tasks t 
         LEFT JOIN users u ON t.assigned_to = u.id
         WHERE t.due_date < CURDATE() AND t.status != 'Completed' 
         LIMIT 5`
      );
      overdueTasks = result || [];
    } catch (err) {
      logger.warn('Overdue tasks query issue:', err.message);
    }

    // Monthly leads (last 6 months)
    let monthlyLeads = [];
    try {
      const [result] = await pool.query(`
        SELECT DATE_FORMAT(created_at,'%b %Y') as month, COUNT(*) as count
        FROM leads WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY month 
        ORDER BY MIN(created_at) ASC
      `);
      monthlyLeads = result || [];
    } catch (err) {
      logger.warn('Monthly leads query issue:', err.message);
    }

    // Top performing users
    let topUsers = [];
    try {
      const [result] = await pool.query(`
        SELECT 
          u.id,
          CONCAT(u.first_name, ' ', u.last_name) as name,
          COUNT(DISTINCT l.id) as leads_assigned,
          COUNT(DISTINCT d.id) as deals_assigned,
          IFNULL(SUM(d.value), 0) as total_deal_value
        FROM users u
        LEFT JOIN leads l ON u.id = l.assigned_to
        LEFT JOIN deals d ON u.id = d.assigned_to
        WHERE u.is_active = TRUE
        GROUP BY u.id, u.first_name, u.last_name
        ORDER BY total_deal_value DESC
        LIMIT 5
      `);
      topUsers = result || [];
    } catch (err) {
      logger.warn('Top users query issue:', err.message);
    }

    // My stats (current user)
    let myStats = { my_leads: 0, my_deals: 0, my_deal_value: 0, my_tasks: 0 };
    try {
      const [[result]] = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM leads WHERE assigned_to = ?) as my_leads,
          (SELECT COUNT(*) FROM deals WHERE assigned_to = ?) as my_deals,
          (SELECT IFNULL(SUM(value), 0) FROM deals WHERE assigned_to = ? AND stage = 'Won') as my_deal_value,
          (SELECT COUNT(*) FROM tasks WHERE assigned_to = ? AND status != 'Completed') as my_tasks
      `, [req.user.userId, req.user.userId, req.user.userId, req.user.userId]);
      myStats = result || myStats;
    } catch (err) {
      logger.warn('My stats query issue:', err.message);
    }

    res.json({
      success: true,
      data: {
        // Summary stats (flat for easier frontend access)
        totalLeads,
        totalContacts,
        totalDeals,
        pendingTasks,
        totalUsers,
        totalRevenue,
        monthlyRevenue,
        pipelineValue,
        conversionRate: `${conversionRate}%`,
        
        // Personal stats
        myStats,
        
        // Status & stage breakdown
        leadsByStatus: leadsByStatus || [],
        dealsByStage: dealsByStage || [],
        
        // Data feeds
        activities: activities || [],
        tasksDueToday: tasksDueToday || [],
        overdueTasks: overdueTasks || [],
        monthlyLeads: monthlyLeads || [],
        topUsers: topUsers || []
      }
    });
  } catch (e) {
    logger.error('Dashboard load failed:', e.message);
    next(e);
  }
});

// POST add activity/note
router.post('/activity', authenticate, async (req, res, next) => {
  try {
    const { type, description, module, module_id } = req.body;
    
    await logActivity(req.user.userId, type || 'Note', description, module, module_id);
    
    res.status(201).json({ success: true, message: 'Activity logged!' });
  } catch (e) {
    logger.error('Log activity failed:', e.message);
    next(e);
  }
});

// GET audit logs
router.get('/audit/logs', authenticate, async (req, res, next) => {
  try {
    const { entity_type, days } = req.query;
    const daysBack = parseInt(days) || 7;

    let query = 'SELECT a.*, CONCAT(u.first_name, \' \', u.last_name) as user_name FROM audit_logs a LEFT JOIN users u ON a.user_id = u.id WHERE a.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
    const params = [daysBack];

    if (entity_type) {
      query += ' AND a.entity_type = ?';
      params.push(entity_type);
    }

    query += ' ORDER BY a.created_at DESC LIMIT 100';

    const [logs] = await pool.query(query, params);

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    logger.error('Get audit logs failed:', error.message);
    next(error);
  }
});

module.exports = router;
