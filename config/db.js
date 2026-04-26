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
  host: process.env.DB_HOST,       // Where MySQL is running (localhost)
  user: process.env.DB_USER,       // MySQL username (usually "root")
  password: process.env.DB_PASSWORD, // MySQL password
  database: process.env.DB_NAME,   // The database name we'll use
  port: process.env.DB_PORT,       // MySQL port (default: 3306)
  waitForConnections: true,        // Wait if all connections are busy
  connectionLimit: 10,             // Max 10 simultaneous connections
  queueLimit: 0                    // No limit on waiting requests
});

// Export the pool so other files can use it
module.exports = pool;
