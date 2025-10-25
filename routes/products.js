const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const createUploadMiddleware = require('../middleware/s3');
const { protect, restrictTo, adminOnly } = require('../middleware/auth');
const { 
  createProductValidation, 
  updateProductValidation, 
  validateObjectId, 
  validateCategoryId,
  validateBrandId,
  handleValidationErrors 
} = require('../middleware/validation');

// Create upload middleware for product images
const upload = createUploadMiddleware('product');

// Public routes
// Get all products with filtering and pagination
router.get('/', productController.getProducts);

// Get products by category (must come before /:id to avoid conflicts)
router.get('/category/:categoryId', validateCategoryId, handleValidationErrors, productController.getProductsByCategory);

// Get products by brand (must come before /:id to avoid conflicts)
router.get('/brand/:brandId', validateBrandId, handleValidationErrors, productController.getProductsByBrand);

// Get featured products (must come before /:id to avoid conflicts)
router.get('/featured', productController.getFeaturedProducts);

// Admin-only routes for product management (must come before /:id)
router.get('/statistics', protect, adminOnly, productController.getProductStatistics);
// Alias for statistics to support '/stats' path used by some clients
router.get('/stats', protect, adminOnly, productController.getProductStatistics);
router.get('/low-stock', protect, adminOnly, productController.getLowStockProducts);
router.get('/out-of-stock', protect, adminOnly, productController.getOutOfStockProducts);
// Admin list all products with management filters
router.get('/admin', protect, adminOnly, productController.getAdminProducts);

// Admin featured products management
router.get('/admin/featured', protect, adminOnly, productController.getAdminFeaturedProducts);

// Test S3 upload (Admin only) - Remove this after testing
router.post('/test-upload', 
  protect,
  adminOnly,
  upload.single('testImage'),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'No file uploaded' 
        });
      }

      res.json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          originalName: req.file.originalname,
          filename: req.file.filename,
          location: req.file.location,
          key: req.file.key,
          size: req.file.size,
          mimetype: req.file.mimetype,
          bucket: req.file.bucket
        }
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: 'Upload failed',
        error: error.message 
      });
    }
  }
);

// Debug endpoint for category products - Remove this after testing
router.get('/debug/category/:categoryId', (req, res) => {
  try {
    const { categoryId } = req.params;
    const mongoose = require('mongoose');
    
    res.json({
      success: true,
      message: 'Debug info',
      data: {
        categoryId,
        isValidObjectId: mongoose.Types.ObjectId.isValid(categoryId),
        categoryIdLength: categoryId.length,
        query: req.query
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Debug failed',
      error: error.message
    });
  }
});

// Get single product by ID (must come after specific routes)
router.get('/:id([0-9a-fA-F]{24})', validateObjectId, handleValidationErrors, productController.getProductById);

// Protected routes (require authentication)
// Create product (Admin only)
router.post('/', 
  protect,
  adminOnly,
  upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'otherImages', maxCount: 10 },
    { name: 'specificationsFile', maxCount: 1 }
  ]),
  upload.errorHandler,
  createProductValidation,
  handleValidationErrors,
  productController.createProduct
);

// Update product (Admin only)
router.put('/:id([0-9a-fA-F]{24})', 
  protect,
  adminOnly,
  validateObjectId,
  upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'otherImages', maxCount: 10 },
    { name: 'specificationsFile', maxCount: 1 }
  ]),
  upload.errorHandler,
  updateProductValidation,
  handleValidationErrors,
  productController.updateProduct
);

// Delete product (Admin only)
router.delete('/:id([0-9a-fA-F]{24})', 
  protect,
  adminOnly,
  validateObjectId,
  handleValidationErrors,
  productController.deleteProduct
);

// Bulk update products (Admin only)
router.put('/bulk', 
  protect,
  adminOnly,
  productController.bulkUpdateProducts
);

// Duplicate product (Admin only)
router.post('/:id([0-9a-fA-F]{24})/duplicate', 
  protect,
  adminOnly,
  validateObjectId,
  handleValidationErrors,
  productController.duplicateProduct
);

// Update product stock (Admin only)
router.patch('/:id([0-9a-fA-F]{24})/stock', 
  protect,
  adminOnly,
  validateObjectId,
  handleValidationErrors,
  productController.updateProductStock
);

// Featured product management (Admin only)
router.patch('/:id([0-9a-fA-F]{24})/feature', 
  protect,
  adminOnly,
  validateObjectId,
  handleValidationErrors,
  productController.setProductFeatured
);

router.patch('/:id([0-9a-fA-F]{24})/unfeature', 
  protect,
  adminOnly,
  validateObjectId,
  handleValidationErrors,
  productController.unsetProductFeatured
);

router.patch('/:id([0-9a-fA-F]{24})/feature-order', 
  protect,
  adminOnly,
  validateObjectId,
  handleValidationErrors,
  productController.updateFeaturedOrder
);

module.exports = router; 