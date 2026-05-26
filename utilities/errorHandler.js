// ============================================
// CENTRALIZED ERROR HANDLER
// ============================================
const logger = require('./logger');

class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal Server Error';

  // Log error
  logger.error({
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode,
    path: req.path,
    method: req.method,
    user: req.user?.userId
  });

  // Wrong MongoDB ID error
  if (err.name === 'CastError') {
    err.statusCode = 400;
    err.message = 'Invalid ID';
  }

  // JWT expired
  if (err.name === 'JsonWebTokenError') {
    err.statusCode = 401;
    err.message = 'Invalid token';
  }

  // Duplicate key error
  if (err.code === 'ER_DUP_ENTRY') {
    err.statusCode = 400;
    err.message = 'Duplicate entry';
  }

  // Missing required field
  if (err.code === 'ER_NO_DEFAULT_FOR_FIELD') {
    err.statusCode = 400;
    err.message = 'Missing required field';
  }

  return res.status(err.statusCode).json({
    success: false,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = { AppError, errorHandler };
