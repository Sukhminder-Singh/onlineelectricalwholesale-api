const mongoose = require('mongoose');

const checkDBConnection = (req, res, next) => {
  // Check if mongoose is connected
  if (mongoose.connection.readyState === 1) {
    // Connected - proceed
    return next();
  }
  
  // If not connected, check if we're in a buffering state
  if (mongoose.connection.readyState === 2) {
    // Connecting - wait a bit and retry
    return res.status(503).json({
      success: false,
      message: 'Database is connecting. Please try again in a moment.',
      retryAfter: 5
    });
  }
  
  // Disconnected or disconnecting
  return res.status(503).json({
    success: false,
    message: 'Database connection not available. Please try again later.',
    error: 'DB_CONNECTION_UNAVAILABLE'
  });
};

module.exports = checkDBConnection; 