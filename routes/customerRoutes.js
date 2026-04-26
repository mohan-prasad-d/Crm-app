// ============================================
// CUSTOMER API ROUTES
// ============================================
// This file contains all the REST API endpoints
// for managing customers (CRUD operations):
//
//   GET    /api/customers       → Get all customers (with optional search)
//   GET    /api/customers/:id   → Get one customer by ID
//   POST   /api/customers       → Add a new customer
//   PUT    /api/customers/:id   → Update an existing customer
//   DELETE /api/customers/:id   → Delete a customer
// ============================================

const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// ============================================
// 1. GET ALL CUSTOMERS (with search support)
// ============================================
// URL: GET /api/customers
// Optional: GET /api/customers?search=john
// This fetches all customers, or filters by name/phone
router.get('/', async (req, res) => {
  try {
    const { search } = req.query; // Get search term from URL query
    let query = '';
    let params = [];

    if (search) {
      // If there's a search term, filter by name OR phone
      // The % symbols mean "match anything before/after"
      query = `
        SELECT * FROM customers 
        WHERE name LIKE ? OR phone LIKE ? 
        ORDER BY created_at DESC
      `;
      params = [`%${search}%`, `%${search}%`];
    } else {
      // No search term — get all customers
      query = 'SELECT * FROM customers ORDER BY created_at DESC';
    }

    // Execute the query and get results
    const [rows] = await pool.query(query, params);

    // Send back the data as JSON
    res.json({
      success: true,
      data: rows,
      count: rows.length
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customers',
      error: error.message
    });
  }
});

// ============================================
// 2. GET SINGLE CUSTOMER BY ID
// ============================================
// URL: GET /api/customers/5  (where 5 is the customer ID)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params; // Get the ID from the URL

    const [rows] = await pool.query(
      'SELECT * FROM customers WHERE id = ?',
      [id]
    );

    // Check if customer was found
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      data: rows[0] // Return the first (and only) result
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer',
      error: error.message
    });
  }
});

// ============================================
// 3. ADD A NEW CUSTOMER
// ============================================
// URL: POST /api/customers
// Body: { name, phone, email, product, status }
router.post('/', async (req, res) => {
  try {
    const { name, phone, email, product, status } = req.body;

    // Validate required fields
    if (!name || !phone || !email || !product) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields (name, phone, email, product)'
      });
    }

    // INSERT the new customer into the database
    const [result] = await pool.query(
      `INSERT INTO customers (name, phone, email, product, status) 
       VALUES (?, ?, ?, ?, ?)`,
      [name, phone, email, product, status || 'Interested']
    );

    // result.insertId gives us the auto-generated ID
    res.status(201).json({
      success: true,
      message: 'Customer added successfully!',
      data: { id: result.insertId, name, phone, email, product, status }
    });
  } catch (error) {
    console.error('Error adding customer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add customer',
      error: error.message
    });
  }
});

// ============================================
// 4. UPDATE AN EXISTING CUSTOMER
// ============================================
// URL: PUT /api/customers/5
// Body: { name, phone, email, product, status }
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, product, status } = req.body;

    // Validate required fields
    if (!name || !phone || !email || !product) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields'
      });
    }

    // UPDATE the customer's data in the database
    const [result] = await pool.query(
      `UPDATE customers 
       SET name = ?, phone = ?, email = ?, product = ?, status = ? 
       WHERE id = ?`,
      [name, phone, email, product, status, id]
    );

    // Check if any row was actually updated
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      message: 'Customer updated successfully!'
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update customer',
      error: error.message
    });
  }
});

// ============================================
// 5. DELETE A CUSTOMER
// ============================================
// URL: DELETE /api/customers/5
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      'DELETE FROM customers WHERE id = ?',
      [id]
    );

    // Check if any row was actually deleted
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      message: 'Customer deleted successfully!'
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete customer',
      error: error.message
    });
  }
});

// Export the router so server.js can use it
module.exports = router;
