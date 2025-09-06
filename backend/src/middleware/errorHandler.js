const { logger } = require('../config/logger');
const { ERROR_MESSAGES } = require('../config/constants');

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode, errorCode = null, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.errorCode = errorCode;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, 500, 'DATABASE_ERROR');
  }
}

class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

// Handle different types of errors
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400, 'INVALID_DATA');
};

const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `Duplicate field value: ${value}. Please use another value.`;
  return new ConflictError(message);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new ValidationError(message, errors);
};

const handleJWTError = () =>
  new AuthenticationError('Invalid token. Please log in again.');

const handleJWTExpiredError = () =>
  new AuthenticationError('Your token has expired. Please log in again.');

const handleMulterError = (err) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return new ValidationError('File too large. Maximum size is 5MB.');
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return new ValidationError('Unexpected file field.');
  }
  return new ValidationError('File upload error.');
};

const handleRedisError = (err) => {
  logger.warn('Redis connection error:', err.message);
  // Don't fail the request, just log the error
  return null;
};

const handleDatabaseConnectionError = (err) => {
  logger.error('Database connection error:', err);
  return new ServiceUnavailableError('Database connection failed. Please try again later.');
};

// Send error response based on environment
const sendErrorDev = (err, req, res) => {
  // API error
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: {
        message: err.message,
        code: err.errorCode,
        details: err.details,
        stack: err.stack,
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        method: req.method
      }
    });
  }

  // Render error page for non-API routes
  console.error('ERROR 💥', err);
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: err.message
  });
};

const sendErrorProd = (err, req, res) => {
  // API error
  if (req.originalUrl.startsWith('/api')) {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        error: {
          message: err.message,
          code: err.errorCode,
          details: err.details,
          timestamp: new Date().toISOString(),
          path: req.originalUrl,
          method: req.method
        }
      });
    }

    // Programming or other unknown error: don't leak error details
    logger.error('ERROR 💥', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    return res.status(500).json({
      status: 'error',
      error: {
        message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString()
      }
    });
  }

  // Render error page for non-API routes
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message
    });
  }

  // Programming or other unknown error
  logger.error('ERROR 💥', err);
  return res.status(500).render('error', {
    title: 'Something went wrong!',
    msg: 'Please try again later.'
  });
};

// Global error handling middleware
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  err.errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';

  // Log error details
  logger.error('Error Handler:', {
    message: err.message,
    statusCode: err.statusCode,
    errorCode: err.errorCode,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    stack: err.stack
  });

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    if (error.name === 'MulterError') error = handleMulterError(error);
    if (error.name === 'RedisError') error = handleRedisError(error);
    if (error.name === 'DatabaseConnectionError') error = handleDatabaseConnectionError(error);

    sendErrorProd(error, req, res);
  }
};

// Async error catcher - wraps async route handlers
const asyncErrorCatcher = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// Error boundary for specific operations
const errorBoundary = async (operation, fallback = null) => {
  try {
    return await operation();
  } catch (error) {
    logger.error('Error boundary caught:', error);
    if (fallback) {
      return typeof fallback === 'function' ? fallback(error) : fallback;
    }
    throw error;
  }
};

// Retry mechanism with exponential backoff
const retryWithExponentialBackoff = async (
  operation,
  maxRetries = 3,
  initialDelay = 1000
) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        logger.warn(`Operation failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

module.exports = {
  errorHandler,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ServiceUnavailableError,
  asyncErrorCatcher,
  errorBoundary,
  retryWithExponentialBackoff
};