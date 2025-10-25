const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

// Import middleware
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { httpLogger, performanceLogger, securityLogger } = require('./middleware/logger');
const { securityMiddleware, requestSizeLimiter } = require('./middleware/security');

// Import routes
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const categoryProductRoutes = require('./routes/categoryProducts');
const brandRoutes = require('./routes/brands');
const authRoutes = require('./routes/auth');
const attributeRoutes = require('./routes/attributes');
const uploadRoutes = require('./routes/upload');
const countryRoutes = require('./routes/countries');
const stateRoutes = require('./routes/states');
const cityRoutes = require('./routes/cities');
const sliderRoutes = require('./routes/sliders');
const promoCodeRoutes = require('./routes/promoCodes');
const customerRoutes = require('./routes/customers');
const orderRoutes = require('./routes/orders');
const transactionRoutes = require('./routes/transactions');
const addressRoutes = require('./routes/addresses');

const app = express();

// Trust proxy configuration for proper IP address detection
// This is important for rate limiting and security features
app.set('trust proxy', 1);

// Security middleware (must be first)
securityMiddleware.forEach(middleware => app.use(middleware));

// Request size limiting
app.use(requestSizeLimiter);

// Logging middleware
app.use(httpLogger);
app.use(performanceLogger);
app.use(securityLogger);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const memoryUsage = process.memoryUsage();
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`
    }
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/category', categoryProductRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/attributes', attributeRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/countries', countryRoutes);
app.use('/api/states', stateRoutes);
app.use('/api/cities', cityRoutes);
app.use('/api/sliders', sliderRoutes);
app.use('/api/promo-codes', promoCodeRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/addresses', addressRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Online Wholesale API is running',
    version: '1.0.0',
    health: '/health',
    timestamp: new Date().toISOString()
  });
});

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;