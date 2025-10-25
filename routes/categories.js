const express = require('express');
const router = express.Router();
const multer = require('multer');
const { body } = require('express-validator');
const categoryController = require('../controllers/categoryController');
const { protect, restrictTo, adminOnly } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { strictLimiter, apiLimiter } = require('../middleware/rateLimit');
const createUploadMiddleware = require('../middleware/s3');
const upload = createUploadMiddleware('category'); // Create upload middleware for category folder
const checkDBConnection = require('../middleware/dbConnection');

// Validation rules
const categoryValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Category name must be between 2 and 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean value'),
  body('order').optional().isInt({ min: 0 }).withMessage('Order must be a positive integer')
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
        'LIMIT_UNEXPECTED_FILE': 'Unexpected field. Please use "image" as the field name.'
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

// Apply database connection check to all routes
router.use(checkDBConnection);

// Create category (Admin only)
router.post('/', 
  strictLimiter,
  protect, 
  adminOnly, 
  upload.single('image'), 
  handleUploadError,
  categoryValidation, 
  validateRequest, 
  categoryController.createCategory
);

// Get all categories (Public)
router.get('/', 
  apiLimiter, 
  categoryController.getCategories
);

// Get category tree (Public)
router.get('/tree', 
  apiLimiter, 
  categoryController.getCategoriesTree
);

// Get sample tree (Public)
router.get('/sample-tree', 
  categoryController.getCategoriesSampleTree
);

// Get frontend tree (Public)
router.get('/frontend-tree', 
  categoryController.getCategoriesFrontendTree
);

// Get parent categories only (Public)
router.get('/parents', 
  apiLimiter, 
  categoryController.getParentCategories
);

// Update category order (Admin only)
router.put('/order', 
  strictLimiter,
  protect, 
  adminOnly, 
  categoryController.updateOrder
);

// Bulk update categories (Admin only)
router.put('/bulk', 
  strictLimiter,
  protect, 
  adminOnly, 
  categoryController.bulkUpdate
);

// Toggle category status (Admin only)
router.patch('/:id/status', 
  strictLimiter,
  protect, 
  adminOnly, 
  statusValidation,
  validateRequest,
  categoryController.toggleStatus
);

// Get single category (Public)
router.get('/:id', 
  apiLimiter, 
  categoryController.getCategoryById
);

// Update category (Admin only)
router.put('/:id', 
  strictLimiter,
  protect, 
  adminOnly, 
  upload.single('image'), 
  handleUploadError,
  categoryValidation, 
  validateRequest, 
  categoryController.updateCategory
);

// Delete category (Admin only)
router.delete('/:id', 
  strictLimiter,
  protect, 
  adminOnly, 
  categoryController.deleteCategory
);

module.exports = router;