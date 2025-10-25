const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { apiLimiter } = require('../middleware/rateLimit');

// Get products by category slug
// Route: /api/category/:slug
router.get('/:slug', 
  apiLimiter, 
  productController.getProductsByCategorySlug
);

module.exports = router;
