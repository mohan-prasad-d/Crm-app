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

    // USERS TABLE (Authentication & Roles)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role ENUM('Admin','Manager','Employee') DEFAULT 'Employee',
        department VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE,
        last_login TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_username (username),
        INDEX idx_email (email),
        INDEX idx_role (role)
      )
    `);

    // ROLES & PERMISSIONS TABLE
    await connection.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        role_name VARCHAR(50) NOT NULL UNIQUE,
        description VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        role_id INT,
        module VARCHAR(50),
        action VARCHAR(50),
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        UNIQUE KEY unique_role_module_action (role_id, module, action)
      )
    `);

    // LEADS TABLE (Enhanced)
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
        assigned_to INT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_status (status),
        INDEX idx_assigned_to (assigned_to),
        INDEX idx_created_at (created_at)
      )
    `);

    // CONTACTS TABLE (Enhanced)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        phone VARCHAR(20),
        company VARCHAR(100),
        title VARCHAR(100),
        address TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_email (email),
        INDEX idx_company (company)
      )
    `);

    // DEALS TABLE (Pipeline/Kanban - Enhanced)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS deals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        contact_name VARCHAR(100),
        lead_id INT,
        value DECIMAL(12,2) DEFAULT 0,
        stage ENUM('Negotiation','Proposal','Won','Lost','Qualification') DEFAULT 'Qualification',
        close_date DATE,
        probability INT DEFAULT 20,
        assigned_to INT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_stage (stage),
        INDEX idx_assigned_to (assigned_to),
        INDEX idx_created_at (created_at)
      )
    `);

    // TASKS TABLE (Enhanced)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        due_date DATE,
        priority ENUM('Low','Medium','High') DEFAULT 'Medium',
        status ENUM('Pending','In Progress','Completed') DEFAULT 'Pending',
        related_to VARCHAR(100),
        related_id INT,
        assigned_to INT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_status (status),
        INDEX idx_due_date (due_date),
        INDEX idx_assigned_to (assigned_to)
      )
    `);

    // ACTIVITIES/AUDIT LOGS TABLE
    await connection.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        action VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50),
        entity_id INT,
        old_values JSON,
        new_values JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_entity (entity_type, entity_id),
        INDEX idx_created_at (created_at),
        INDEX idx_user_id (user_id)
      )
    `);

    // ACTIVITIES TABLE (simpler activity feed)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        type ENUM('Note','Call','Email','Meeting','Task','Deal','Lead') DEFAULT 'Note',
        description TEXT NOT NULL,
        module VARCHAR(50),
        module_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_created_at (created_at),
        INDEX idx_module (module, module_id)
      )
    `);

    // NOTIFICATIONS TABLE
    await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type ENUM('lead_assigned','task_deadline','deal_updated','comment','system') DEFAULT 'system',
        title VARCHAR(200),
        message TEXT,
        related_type VARCHAR(50),
        related_id INT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id_read (user_id, is_read),
        INDEX idx_created_at (created_at)
      )
    `);

    // COMMENTS TABLE
    await connection.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INT NOT NULL,
        user_id INT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_entity (entity_type, entity_id),
        INDEX idx_created_at (created_at)
      )
    `);

    // ATTACHMENTS/FILE UPLOADS TABLE
    await connection.query(`
      CREATE TABLE IF NOT EXISTS attachments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INT NOT NULL,
        filename VARCHAR(255) NOT NULL,
        original_filename VARCHAR(255),
        file_path VARCHAR(500),
        file_size INT,
        file_type VARCHAR(100),
        uploaded_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_entity (entity_type, entity_id)
      )
    `);

    // EMAIL LOGS TABLE (for notifications tracking)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        recipient_email VARCHAR(100),
        subject VARCHAR(255),
        status ENUM('sent','failed','pending') DEFAULT 'pending',
        error_message TEXT,
        related_type VARCHAR(50),
        related_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sent_at TIMESTAMP NULL,
        INDEX idx_created_at (created_at)
      )
    `);

    // LEAD ASSIGNMENTS (Track assignment history)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS lead_assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lead_id INT NOT NULL,
        assigned_to INT NOT NULL,
        assigned_by INT,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        unassigned_at TIMESTAMP NULL,
        FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_lead_id (lead_id),
        INDEX idx_assigned_to (assigned_to)
      )
    `);

    // SYSTEM LOGS TABLE
    await connection.query(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        level VARCHAR(20),
        message TEXT,
        context JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_level (level),
        INDEX idx_created_at (created_at)
      )
    `);

    console.log('✅ All tables are ready');

    // ============================================
    // CREATE DEFAULT ADMIN USER
    // ============================================
    const bcrypt = require('bcryptjs');
    
    // Check if admin user already exists
    const [existingAdmin] = await connection.query(
      'SELECT id FROM users WHERE username = ?',
      ['admin']
    );

    if (existingAdmin.length === 0) {
      // Hash the default password
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      // Create admin user
      await connection.query(
        `INSERT INTO users 
         (username, email, password, first_name, last_name, role, is_active)
         VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
        ['admin', 'admin@crm.local', hashedPassword, 'Admin', 'User', 'Admin']
      );
      
      console.log('✅ Default admin user created (admin / password123)');
    } else {
      console.log('✅ Admin user already exists');
    }

    await connection.end();
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    if (connection) await connection.end();
    throw error;
  }
}

module.exports = initializeDatabase;
