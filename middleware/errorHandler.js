const { logger } = require('./logger');

// Custom error classes for different types of errors
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400);
    this.errors = errors;
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

// Error handler middleware
const errorHandler = (err, req, res, next) => {
  
  let error = { ...err };
  error.message = err.message;
  
  // Ensure we preserve the original error properties
  if (err.errors) {
    error.errors = err.errors;
  }
  if (err.keyValue) {
    error.keyValue = err.keyValue;
  }

  // Log error details
  const errorDetails = {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    userId: req.user?.id || 'anonymous',
    timestamp: new Date().toISOString(),
    body: req.body,
    query: req.query,
    params: req.params
  };

  // Log based on error type (with error handling)
  try {
    if (err.isOperational) {
      logger.warn('Operational error occurred', errorDetails);
    } else {
      logger.error('Unexpected error occurred', errorDetails);
    }
  } catch (logError) {
    // Silent fail if logger fails
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Invalid resource ID format';
    error = new AppError(message, 400);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    try {
      if (err.keyValue && typeof err.keyValue === 'object' && Object.keys(err.keyValue).length > 0) {
        const field = Object.keys(err.keyValue)[0];
        const message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
        error = new ConflictError(message);
      } else {
        error = new ConflictError('Duplicate key error');
      }
    } catch (keyError) {
      error = new ConflictError('Duplicate key error');
    }
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    try {
      // Add extra safety checks for err.errors
      if (err.errors && typeof err.errors === 'object' && Object.keys(err.errors).length > 0) {
        try {
          const errors = Object.values(err.errors).map(val => ({
            field: val.path,
            message: val.message,
            value: val.value
          }));
          const message = 'Validation failed';
          error = new ValidationError(message, errors);
        } catch (mapError) {
          // Fallback if mapping fails
          error = new ValidationError('Validation failed', []);
        }
      } else {
        // Handle case where err.errors is undefined, null, or empty
        error = new ValidationError(err.message || 'Validation failed', []);
      }
    } catch (validationError) {
      error = new ValidationError('Validation failed', []);
    }
  }
  
  // Handle custom ValidationError (from our controllers)
  if (err.constructor && err.constructor.name === 'ValidationError' && !err.errors) {
    // This is our custom ValidationError, not Mongoose's
    error = new ValidationError(err.message || 'Validation failed', []);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new AuthenticationError(message);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new AuthenticationError(message);
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File too large';
    error = new AppError(message, 400);
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    const message = 'Too many files';
    error = new AppError(message, 400);
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = 'Unexpected file field';
    error = new AppError(message, 400);
  }

  // Rate limit errors
  if (err.status === 429) {
    error = new RateLimitError(err.message);
  }

  // Database connection errors
  if (err.name === 'MongoNetworkError' || err.name === 'MongoServerSelectionError') {
    const message = 'Database connection failed';
    error = new AppError(message, 503);
  }

  // Default error
  if (!error.statusCode) {
    error.statusCode = 500;
    error.message = 'Internal server error';
  }

  // Development vs Production error response
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const errorResponse = {
    success: false,
    message: error.message,
    ...(isDevelopment && { 
      stack: err.stack,
      details: errorDetails,
      originalError: err.message
    })
  };

  // Add validation errors if they exist and are not empty
  if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
    errorResponse.errors = error.errors;
  }
  
  // Final safety check - ensure we have a valid error object
  if (!error || typeof error !== 'object') {
    error = new AppError('Internal server error', 500);
    errorResponse.message = 'Internal server error';
  }

  // Add retry-after header for rate limiting
  if (error.statusCode === 429) {
    res.set('Retry-After', '900'); // 15 minutes
  }

  // Send error response
  res.status(error.statusCode).json(errorResponse);
};

// Async error wrapper for controllers
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler for undefined routes
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

// Note: Global unhandled rejection and uncaught exception handlers
// are handled in server.js to avoid duplicate event listeners

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  errorHandler,
  asyncHandler,
  notFoundHandler
};
