const express = require('express');
const router = express.Router();
const multer = require('multer');
const { body } = require('express-validator');
const brandController = require('../controllers/brandController');
const { protect, restrictTo, adminOnly } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { strictLimiter, apiLimiter } = require('../middleware/rateLimit');
const createUploadMiddleware = require('../middleware/s3');
const upload = createUploadMiddleware('brand'); // Create upload middleware for brand folder

// Validation rules
const brandValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Brand name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-&.]+$/)
    .withMessage('Brand name can only contain letters, numbers, spaces, hyphens, ampersands, and periods'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('website').optional().isURL().withMessage('Please provide a valid website URL'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean value')
];

const statusValidation = [
  body('isActive').isBoolean().withMessage('isActive must be a boolean value')
];

// Error handling for multer and S3 uploads
const handleUploadError = (err, req, res, next) => {
  if (err) {
    // Handle Multer errors
    if (err instanceof multer.MulterError) {
      const messages = {
        'LIMIT_FILE_SIZE': 'File size too large. Maximum size is 5MB.',
        'LIMIT_FILE_COUNT': 'Too many files. Only one file is allowed.',
        'LIMIT_UNEXPECTED_FILE': 'Unexpected field. Please use "logo" as the field name.'
      };
      return res.status(400).json({ 
        success: false, 
        message: messages[err.code] || `File upload error: ${err.message}`
      });
    }
    
    // Handle S3 errors
    if (err.name === 'S3Error') {
      return res.status(500).json({
        success: false,
        message: 'Error uploading to S3',
        error: err.message
      });
    }

    // Handle file type error
    if (err.message === 'Only image files are allowed!') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only image files are allowed!' 
      });
    }

    // Handle other errors
    return res.status(500).json({
      success: false,
      message: 'File upload failed',
      error: err.message
    });
  }
  next();
};

// Routes

// Create brand (Admin only)
router.post('/', 
  strictLimiter,
  protect, 
  adminOnly, 
  upload.single('logo'), 
  handleUploadError,
  brandValidation, 
  validateRequest, 
  brandController.createBrand
);

// Get all brands (Public)
router.get('/', 
  apiLimiter, 
  brandController.getBrands
);

// Get single brand (Public)
router.get('/:id', 
  apiLimiter, 
  brandController.getBrandById
);

// Update brand (Admin only)
router.put('/:id', 
  strictLimiter,
  protect, 
  adminOnly, 
  upload.single('logo'), 
  handleUploadError,
  brandValidation, 
  validateRequest, 
  brandController.updateBrand
);

// Change brand status (Admin only)
router.patch('/:id/status', 
  strictLimiter,
  protect, 
  adminOnly, 
  statusValidation,
  validateRequest,
  brandController.updateBrandStatus
);

// Delete brand (Admin only)
router.delete('/:id', 
  strictLimiter,
  protect, 
  adminOnly, 
  brandController.deleteBrand
);

module.exports = router; 