// ============================================
// DATABASE INITIALIZATION — ALL TABLES
// ============================================
const mysql = require('mysql2/promise');
require('dotenv').config();

async function initializeDatabase() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT
    });
    console.log('✅ Connected to MySQL server');

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
    await connection.query(`USE \`${process.env.DB_NAME}\``);
    console.log(`✅ Database "${process.env.DB_NAME}" ready`);

    // LEADS TABLE
    await connection.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        phone VARCHAR(20),
        company VARCHAR(100),
        source ENUM('Website','Social Media','Referral','Cold Call','Email','Other') DEFAULT 'Other',
        status ENUM('New','Contacted','Qualified','Proposal','Won','Lost') DEFAULT 'New',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // CONTACTS TABLE
    await connection.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        phone VARCHAR(20),
        company VARCHAR(100),
        title VARCHAR(100),
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // DEALS TABLE (Pipeline/Kanban)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS deals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        contact_name VARCHAR(100),
        value DECIMAL(12,2) DEFAULT 0,
        stage ENUM('Qualification','Proposal','Negotiation','Closed Won','Closed Lost') DEFAULT 'Qualification',
        close_date DATE,
        probability INT DEFAULT 20,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // TASKS TABLE
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        due_date DATE,
        priority ENUM('Low','Medium','High') DEFAULT 'Medium',
        status ENUM('Pending','In Progress','Completed') DEFAULT 'Pending',
        related_to VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ACTIVITIES TABLE
    await connection.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type ENUM('Note','Call','Email','Meeting','Task') DEFAULT 'Note',
        description TEXT NOT NULL,
        module VARCHAR(50),
        module_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ All tables are ready');
    await connection.end();
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    if (connection) await connection.end();
    throw error;
  }
}

module.exports = initializeDatabase;
