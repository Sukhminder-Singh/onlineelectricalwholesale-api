const express = require('express');
const router = express.Router();
const promoCodeController = require('../controllers/promoCodeController');
const { protect, restrictTo, adminOnly } = require('../middleware/auth');
const { 
  promoValidationLimiter, 
  promoApplicationLimiter, 
  promoGenerationLimiter 
} = require('../middleware/rateLimit');
const {
  createPromoCodeValidation,
  updatePromoCodeValidation,
  validatePromoCodeValidation,
  applyPromoCodeValidation,
  duplicatePromoCodeValidation,
  generatePromoCodeValidation,
  validatePromoCodeId,
  handleValidationErrors
} = require('../middleware/validation');

// Public routes (no authentication required)

// Validate promo code (public endpoint for customer use)
router.post('/validate',
  promoValidationLimiter,
  validatePromoCodeValidation,
  handleValidationErrors,
  promoCodeController.validatePromoCode
);

// Apply promo code (public endpoint for order processing)
router.post('/apply',
  promoApplicationLimiter,
  applyPromoCodeValidation,
  handleValidationErrors,
  promoCodeController.applyPromoCode
);

// Protected routes (require authentication)

// Get all promo codes (admin only)
router.get('/',
  protect,
  adminOnly,
  promoCodeController.getAllPromoCodes
);

// Get promo code by ID (admin only)
router.get('/:id',
  protect,
  adminOnly,
  validatePromoCodeId,
  handleValidationErrors,
  promoCodeController.getPromoCodeById
);

// Create new promo code (admin only)
router.post('/',
  protect,
  adminOnly,
  createPromoCodeValidation,
  handleValidationErrors,
  promoCodeController.createPromoCode
);

// Update promo code (admin only)
router.put('/:id',
  protect,
  adminOnly,
  validatePromoCodeId,
  updatePromoCodeValidation,
  handleValidationErrors,
  promoCodeController.updatePromoCode
);

// Delete promo code (admin only)
router.delete('/:id',
  protect,
  adminOnly,
  validatePromoCodeId,
  handleValidationErrors,
  promoCodeController.deletePromoCode
);

// Toggle promo code status (admin only)
router.patch('/:id/toggle-status',
  protect,
  adminOnly,
  validatePromoCodeId,
  handleValidationErrors,
  promoCodeController.togglePromoCodeStatus
);

// Get promo code usage statistics (admin only)
router.get('/:id/statistics',
  protect,
  adminOnly,
  validatePromoCodeId,
  handleValidationErrors,
  promoCodeController.getPromoCodeStatistics
);

// Duplicate promo code (admin only)
router.post('/:id/duplicate',
  protect,
  adminOnly,
  validatePromoCodeId,
  duplicatePromoCodeValidation,
  handleValidationErrors,
  promoCodeController.duplicatePromoCode
);

// Generate unique promo code (admin only)
router.post('/generate-code',
  protect,
  adminOnly,
  promoGenerationLimiter,
  generatePromoCodeValidation,
  handleValidationErrors,
  promoCodeController.generatePromoCode
);

module.exports = router;