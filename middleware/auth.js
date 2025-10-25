const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - require authentication
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check if token exists in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'You are not logged in. Please log in to get access.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.'
      });
    }

    // Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        success: false,
        message: 'User recently changed password! Please log in again.'
      });
    }

    // Check if user is active
    if (!currentUser.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // Grant access to protected route
    req.user = currentUser;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please log in again.'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Your token has expired. Please log in again.'
      });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error occurred.'
    });
  }
};

// Restrict to certain roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action.'
      });
    }
    next();
  };
};

// Optional authentication - doesn't fail if no token
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const currentUser = await User.findById(decoded.id);
      
      if (currentUser && currentUser.isActive && !currentUser.changedPasswordAfter(decoded.iat)) {
        req.user = currentUser;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

// Admin only access - more strict than restrictTo
exports.adminOnly = async (req, res, next) => {
  try {
    // First ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.'
      });
    }

    // Check if user has admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Administrator privileges required.'
      });
    }

    // Double-check user is still active and admin in database
    const currentUser = await User.findById(req.user.id);
    if (!currentUser || !currentUser.isActive || currentUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Administrator privileges required.'
      });
    }

    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error occurred.'
    });
  }
};

// Customer only access
exports.customerOnly = async (req, res, next) => {
  try {
    // First ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.'
      });
    }

    // Check if user has customer role
    if (req.user.role !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This endpoint is for customers only.'
      });
    }

    // Double-check user is still active and customer in database
    const currentUser = await User.findById(req.user.id);
    if (!currentUser || !currentUser.isActive || currentUser.role !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This endpoint is for customers only.'
      });
    }

    next();
  } catch (error) {
    console.error('Customer auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error occurred.'
    });
  }
};

// Enhanced role validation - validates against multiple roles and checks database
exports.validateRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      // First ensure user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required. Please log in.'
        });
      }

      // Check if user's role is in allowed roles
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
        });
      }

      // Double-check user is still active and has correct role in database
      const currentUser = await User.findById(req.user.id);
      if (!currentUser || !currentUser.isActive || !allowedRoles.includes(currentUser.role)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
        });
      }

      // Update req.user with fresh data from database
      req.user = currentUser;
      next();
    } catch (error) {
      console.error('Role validation middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authentication error occurred.'
      });
    }
  };
};