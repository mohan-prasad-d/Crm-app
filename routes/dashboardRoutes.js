// ============================================
// DASHBOARD STATS ROUTE
// ============================================
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/', async (req, res) => {
  try {
    // Counts
    const [[{ totalLeads }]] = await pool.query('SELECT COUNT(*) as totalLeads FROM leads');
    const [[{ totalContacts }]] = await pool.query('SELECT COUNT(*) as totalContacts FROM contacts');
    const [[{ totalDeals }]] = await pool.query('SELECT COUNT(*) as totalDeals FROM deals');
    const [[{ pendingTasks }]] = await pool.query("SELECT COUNT(*) as pendingTasks FROM tasks WHERE status != 'Completed'");

    // Revenue from Won deals
    const [[{ totalRevenue }]] = await pool.query("SELECT IFNULL(SUM(value),0) as totalRevenue FROM deals WHERE stage='Closed Won'");

    // Pipeline value (all open deals)
    const [[{ pipelineValue }]] = await pool.query("SELECT IFNULL(SUM(value),0) as pipelineValue FROM deals WHERE stage NOT IN ('Closed Won','Closed Lost')");

    // Lead status breakdown
    const [leadsByStatus] = await pool.query('SELECT status, COUNT(*) as count FROM leads GROUP BY status');

    // Deals by stage
    const [dealsByStage] = await pool.query('SELECT stage, COUNT(*) as count, IFNULL(SUM(value),0) as value FROM deals GROUP BY stage');

    // Recent activities
    const [activities] = await pool.query('SELECT * FROM activities ORDER BY created_at DESC LIMIT 10');

    // Tasks due today
    const [tasksDueToday] = await pool.query(
      "SELECT * FROM tasks WHERE DATE(due_date)=CURDATE() AND status!='Completed' LIMIT 5"
    );

    // Monthly leads (last 6 months)
    const [monthlyLeads] = await pool.query(`
      SELECT DATE_FORMAT(created_at,'%b %Y') as month, COUNT(*) as count
      FROM leads WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY month 
      ORDER BY MIN(created_at) ASC
    `);

    res.json({
      success: true,
      data: {
        totalLeads, totalContacts, totalDeals, pendingTasks,
        totalRevenue, pipelineValue,
        leadsByStatus, dealsByStage,
        activities, tasksDueToday, monthlyLeads
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST add activity/note
router.post('/activity', async (req, res) => {
  try {
    const { type, description, module, module_id } = req.body;
    await pool.query(
      'INSERT INTO activities (type,description,module,module_id) VALUES (?,?,?,?)',
      [type || 'Note', description, module, module_id]
    );
    res.status(201).json({ success: true, message: 'Activity logged!' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
