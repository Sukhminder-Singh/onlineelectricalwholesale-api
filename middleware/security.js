const helmet = require('helmet');
const cors = require('cors');
const hpp = require('hpp');

// Simple XSS protection function
const sanitizeInput = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeInput);
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Basic XSS protection
      sanitized[key] = value
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    } else {
      sanitized[key] = sanitizeInput(value);
    }
  }
  return sanitized;
};

// XSS protection middleware
const xssProtection = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  if (req.query) {
    req.query = sanitizeInput(req.query);
  }
  if (req.params) {
    req.params = sanitizeInput(req.params);
  }
  next();
};

// Security middleware configuration
exports.securityMiddleware = [
  // Set security HTTP headers
  helmet(),

  // Enable CORS
  cors({
    origin: process.env.ALLOWED_ORIGINS ? 
      process.env.ALLOWED_ORIGINS.split(',') : 
      ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count']
  }),

  // Data sanitization against XSS
  xssProtection,

  // Prevent parameter pollution
  hpp({
    whitelist: [
      'filter',
      'sort',
      'page',
      'limit',
      'fields',
      'search'
    ]
  })
];

// Request size limiter
exports.requestSizeLimiter = (req, res, next) => {
  const contentLength = parseInt(req.headers['content-length'] || '0');
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (contentLength > maxSize) {
    return res.status(413).json({
      success: false,
      message: 'Request entity too large. Maximum size is 10MB.'
    });
  }

  next();
};

// IP address extractor
exports.getClientIP = (req) => {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress || 
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.headers['x-forwarded-for'] ||
         req.headers['x-real-ip'];
};

// Request logger for security events
exports.securityLogger = (req, res, next) => {
  const clientIP = exports.getClientIP(req);
  const userAgent = req.headers['user-agent'];
  const timestamp = new Date().toISOString();

  // Log suspicious requests
  if (req.path.includes('..') || req.path.includes('//')) {
    console.log(`🚨 Suspicious request detected: ${clientIP} - ${req.method} ${req.path} - ${userAgent} - ${timestamp}`);
  }

  // Log authentication attempts
  if (req.path === '/api/auth/login' || req.path === '/api/auth/register') {
    console.log(`🔐 Auth attempt: ${clientIP} - ${req.method} ${req.path} - ${timestamp}`);
  }

  next();
};

// Block suspicious user agents
exports.blockSuspiciousUserAgents = (req, res, next) => {
  const userAgent = req.headers['user-agent'] || '';
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java/i,
    /perl/i,
    /ruby/i
  ];

  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));
  
  if (isSuspicious && !req.path.startsWith('/api/health')) {
    console.log(`🚫 Blocked suspicious user agent: ${userAgent} from ${exports.getClientIP(req)}`);
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  next();
};

// Validate request origin
exports.validateOrigin = (req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = process.env.ALLOWED_ORIGINS ? 
    process.env.ALLOWED_ORIGINS.split(',') : 
    ['http://localhost:3000', 'http://localhost:3001'];

  if (origin && !allowedOrigins.includes(origin)) {
    console.log(`🚫 Blocked request from unauthorized origin: ${origin}`);
    return res.status(403).json({
      success: false,
      message: 'Origin not allowed'
    });
  }

  next();
};
