const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
require('dotenv').config();

const initializeDatabase = require('./config/initDB');
const { errorHandler } = require('./utilities/errorHandler');
const logger = require('./utilities/logger');

// Import routes
const authRoutes = require('./routes/authRoutes');
const leadsRoutes = require('./routes/leadsRoutes');
const contactsRoutes = require('./routes/contactsRoutes');
const dealsRoutes = require('./routes/dealsRoutes');
const tasksRoutes = require('./routes/tasksRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const usersRoutes = require('./routes/usersRoutes');
const notificationsRoutes = require('./routes/notificationsRoutes');
const commentsRoutes = require('./routes/commentsRoutes');
const attachmentsRoutes = require('./routes/attachmentsRoutes');
const reportsRoutes = require('./routes/reportsRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Request logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================
// SERVE FRONTEND
// ============================================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================
// API ROUTES
// ============================================
// Public routes
app.use('/api/auth', authRoutes);

// Protected routes (require authentication)
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/deals', dealsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/attachments', attachmentsRoutes);
app.use('/api/reports', reportsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'CRM API is running' });
});

// ============================================
// FRONTEND SPA FALLBACK
// ============================================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================
// ERROR HANDLING
// ============================================
app.use((err, req, res, next) => {
  errorHandler(err, req, res, next);
});

// ============================================
// SERVER STARTUP
// ============================================
async function startServer() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log('');
      console.log('🚀 ================================');
      console.log('🚀  Enhanced CRM v2.0 Running!');
      console.log(`🚀  URL: http://localhost:${PORT}`);
      console.log('🚀  With JWT Auth, RBAC, Audit Logs');
      console.log('🚀 ================================');
    });
  } catch (error) {
    logger.error('❌ Failed to start:', error.message);
    process.exit(1);
  }
}

startServer();
