// ============================================
// DATABASE CONNECTION CONFIGURATION
// ============================================
// This file creates a connection pool to MySQL.
// A "pool" lets us reuse connections instead of
// creating a new one every time — much faster!
// ============================================

const mysql = require('mysql2/promise');
require('dotenv').config();

// Create a connection pool using our .env settings
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true // Important: returns dates as strings to avoid timezone shifts
});

// Export the pool so other files can use it
module.exports = pool;
