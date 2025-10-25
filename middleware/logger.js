const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define which level to log based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Define different log formats
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define file format (without colors)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
try {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log('Logs directory created successfully:', logsDir);
  }
} catch (error) {
  console.warn('Warning: Could not create logs directory:', error.message);
  console.warn('Logs directory path:', logsDir);
  console.warn('Current working directory:', process.cwd());
  console.warn('__dirname:', __dirname);
}

// Define transports
const transports = [
  // Console transport (always available)
  new winston.transports.Console({
    format: logFormat
  })
];

// Add file transports only if logs directory exists and is writable
try {
  // Check if directory exists and is writable
  if (fs.existsSync(logsDir)) {
    try {
      fs.accessSync(logsDir, fs.constants.W_OK);
      
      // Error log file
      transports.push(new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        format: fileFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        handleExceptions: false,
        handleRejections: false
      }));
      
      // Combined log file
      transports.push(new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        format: fileFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        handleExceptions: false,
        handleRejections: false
      }));
      
      console.log('File transports added successfully');
    } catch (accessError) {
      console.warn('Warning: Logs directory is not writable:', accessError.message);
    }
  } else {
    console.warn('Warning: Logs directory does not exist:', logsDir);
  }
} catch (error) {
  console.warn('Warning: Could not add file transports:', error.message);
}

// Create the logger with error handling
let logger;
try {
  logger = winston.createLogger({
    level: level(),
    levels,
    format: fileFormat,
    transports,
    exitOnError: false,
    handleExceptions: false,
    handleRejections: false,
    silent: false
  });
  
  // Handle logger errors gracefully
  logger.on('error', (error) => {
    console.error('Logger error (will not crash app):', error.message);
  });
  
} catch (error) {
  console.error('Failed to create logger, falling back to console:', error.message);
  
  // Fallback logger using only console
  logger = winston.createLogger({
    level: level(),
    transports: [
      new winston.transports.Console({
        format: logFormat
      })
    ],
    exitOnError: false,
    handleExceptions: false,
    handleRejections: false
  });
}

// HTTP request logger middleware
const httpLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  logger.http(`Incoming ${req.method} request to ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    userId: req.user?.id || 'anonymous',
    timestamp: new Date().toISOString()
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    
    // Log response
    logger.http(`Outgoing ${req.method} response from ${req.originalUrl}`, {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id || 'anonymous',
      timestamp: new Date().toISOString()
    });

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Performance logger middleware
const performanceLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Log slow requests
    if (duration > 1000) { // Log requests taking more than 1 second
      logger.warn(`Slow request detected: ${req.method} ${req.originalUrl} took ${duration}ms`, {
        method: req.method,
        url: req.originalUrl,
        duration: `${duration}ms`,
        statusCode: res.statusCode,
        ip: req.ip || req.connection.remoteAddress,
        userId: req.user?.id || 'anonymous',
        timestamp: new Date().toISOString()
      });
    }
  });

  next();
};

// Security event logger
const securityLogger = (req, res, next) => {
  // Log authentication attempts
  if (req.path.includes('/auth/login') || req.path.includes('/auth/register')) {
    logger.info(`Authentication attempt: ${req.method} ${req.originalUrl}`, {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    });
  }

  // Log file uploads
  if (req.path.includes('/upload')) {
    logger.info(`File upload attempt: ${req.method} ${req.originalUrl}`, {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      userId: req.user?.id || 'anonymous',
      timestamp: new Date().toISOString()
    });
  }

  // Log admin operations
  if (req.user?.role === 'admin') {
    logger.info(`Admin operation: ${req.method} ${req.originalUrl}`, {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      adminId: req.user.id,
      timestamp: new Date().toISOString()
    });
  }

  next();
};

// Export logger and middleware
module.exports = {
  logger,
  httpLogger,
  performanceLogger,
  securityLogger
};
