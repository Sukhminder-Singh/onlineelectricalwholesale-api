const express = require('express');
const router = express.Router();
const attributeController = require('../controllers/attributeController');
const { protect, adminOnly } = require('../middleware/auth');
const { createAttributeValidation, updateAttributeValidation } = require('../middleware/validation');
const checkDBConnection = require('../middleware/dbConnection');

// Apply database connection check to all routes
router.use(checkDBConnection);

// Public routes
// Get all attributes (Public - needed for product filtering)
router.get('/', attributeController.getAllAttributes);

// Get single attribute by ID (Public - needed for product details)
router.get('/:id', attributeController.getAttributeById);

// Admin-only routes
// Get attribute statistics (Admin only)
router.get('/stats', 
  protect, 
  adminOnly, 
  attributeController.getAttributeStats
);

// Update attribute order (Admin only)
router.put('/order/update', 
  protect, 
  adminOnly, 
  attributeController.updateAttributeOrder
);

// Bulk update attributes (Admin only)
router.put('/bulk/update', 
  protect, 
  adminOnly, 
  attributeController.bulkUpdateAttributes
);

// Create new attribute (Admin only)
router.post('/', 
  protect, 
  adminOnly, 
  createAttributeValidation, 
  attributeController.createAttribute
);

// Update attribute (Admin only)
router.put('/:id', 
  protect, 
  adminOnly, 
  updateAttributeValidation, 
  attributeController.updateAttribute
);

// Delete attribute (Admin only)
router.delete('/:id', 
  protect, 
  adminOnly, 
  attributeController.deleteAttribute
);

// Toggle attribute status (Admin only)
router.patch('/:id/status', 
  protect, 
  adminOnly, 
  attributeController.toggleAttributeStatus
);

module.exports = router; 