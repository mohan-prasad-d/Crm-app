// ============================================
// ATTACHMENTS ROUTES - File Uploads
// ============================================
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { logActivity } = require('../utilities/auditLog');
const logger = require('../utilities/logger');

// Create uploads directory
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allow only certain file types
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, documents, and spreadsheets are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: fileFilter
});

// Get attachments for an entity
router.get('/:entity_type/:entity_id', authenticate, async (req, res, next) => {
  try {
    const { entity_type, entity_id } = req.params;

    const [attachments] = await pool.query(
      `SELECT a.*, CONCAT(u.first_name, ' ', u.last_name) as uploaded_by_name
       FROM attachments a
       LEFT JOIN users u ON a.uploaded_by = u.id
       WHERE a.entity_type = ? AND a.entity_id = ?
       ORDER BY a.created_at DESC`,
      [entity_type, entity_id]
    );

    res.json({
      success: true,
      data: attachments
    });
  } catch (error) {
    logger.error('Get attachments failed:', error.message);
    next(error);
  }
});

// Upload attachment
router.post('/:entity_type/:entity_id', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    const { entity_type, entity_id } = req.params;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    const [result] = await pool.query(
      `INSERT INTO attachments 
       (entity_type, entity_id, filename, original_filename, file_path, file_size, file_type, uploaded_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        entity_type,
        entity_id,
        req.file.filename,
        req.file.originalname,
        `/uploads/${req.file.filename}`,
        req.file.size,
        req.file.mimetype,
        req.user.userId
      ]
    );

    // Log activity
    await logActivity(
      req.user.userId,
      'Attachment',
      `File uploaded: ${req.file.originalname}`,
      entity_type,
      entity_id
    );

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        id: result.insertId,
        filename: req.file.filename,
        original_filename: req.file.originalname,
        file_path: `/uploads/${req.file.filename}`,
        file_size: req.file.size
      }
    });
  } catch (error) {
    logger.error('Upload attachment failed:', error.message);
    // Clean up uploaded file
    if (req.file) {
      fs.unlink(path.join(uploadsDir, req.file.filename), (err) => {
        if (err) logger.error('Failed to delete file:', err.message);
      });
    }
    next(error);
  }
});

// Download attachment
router.get('/download/:id', authenticate, async (req, res, next) => {
  try {
    const [attachments] = await pool.query(
      'SELECT * FROM attachments WHERE id = ?',
      [req.params.id]
    );

    if (!attachments.length) {
      return res.status(404).json({ success: false, message: 'Attachment not found' });
    }

    const attachment = attachments[0];
    const filePath = path.join(uploadsDir, attachment.filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    res.download(filePath, attachment.original_filename);
  } catch (error) {
    logger.error('Download attachment failed:', error.message);
    next(error);
  }
});

// Delete attachment
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const [attachments] = await pool.query(
      'SELECT * FROM attachments WHERE id = ?',
      [req.params.id]
    );

    if (!attachments.length) {
      return res.status(404).json({ success: false, message: 'Attachment not found' });
    }

    const attachment = attachments[0];
    const filePath = path.join(uploadsDir, attachment.filename);

    // Delete from database
    await pool.query('DELETE FROM attachments WHERE id = ?', [req.params.id]);

    // Delete file from disk
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ success: true, message: 'Attachment deleted' });
  } catch (error) {
    logger.error('Delete attachment failed:', error.message);
    next(error);
  }
});

module.exports = router;
