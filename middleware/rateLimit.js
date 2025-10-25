const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

// Note: Using ipKeyGenerator helper function to properly handle IPv6 addresses
// This prevents the ERR_ERL_KEY_GEN_IPV6 warning and ensures proper rate limiting
// for both IPv4 and IPv6 users

// Fallback key generator for older versions or if ipKeyGenerator is not available
const safeKeyGenerator = (req) => {
  try {
    // Use ipKeyGenerator if available
    if (ipKeyGenerator) {
      return ipKeyGenerator(req);
    }
  } catch (error) {
    console.warn('ipKeyGenerator not available, using fallback:', error.message);
  }
  
  // Fallback: Use a more robust IP extraction method
  const ip = req.ip || 
             req.connection?.remoteAddress || 
             req.socket?.remoteAddress || 
             req.connection?.socket?.remoteAddress || 
             'unknown';
  
  // Handle IPv6 addresses by removing the prefix if present
  return ip.replace(/^::ffff:/, '');
};

// Rate limiter for login attempts
exports.loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many login attempts from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: safeKeyGenerator,
  skip: (req) => {
    // Skip rate limiting for successful logins
    return req.body && req.body.identifier && req.body.password;
  }
});

// Rate limiter for registration
exports.registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 registrations per hour
  message: {
    success: false,
    message: 'Too many registration attempts from this IP, please try again after 1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: safeKeyGenerator
});

// Rate limiter for password reset requests
exports.passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password reset requests per hour
  message: {
    success: false,
    message: 'Too many password reset requests from this IP, please try again after 1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: safeKeyGenerator
});

// General API rate limiter
exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: safeKeyGenerator
});

// Strict rate limiter for sensitive operations
exports.strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: safeKeyGenerator
});

// Rate limiter for promo code validation
exports.promoValidationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 validation requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many promo code validation attempts. Please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: safeKeyGenerator
});

// Rate limiter for promo code application
exports.promoApplicationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 application requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many promo code application attempts. Please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: safeKeyGenerator
});

// Rate limiter for promo code generation
exports.promoGenerationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // Limit each IP to 100 generation requests per hour
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many promo code generation attempts. Please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: safeKeyGenerator
});
