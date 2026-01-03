const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const checkDBConnection = require('../middleware/dbConnection');
const createUploadMiddleware = require('../middleware/s3');

// Create upload middleware for general uploads folder in S3
const upload = createUploadMiddleware('uploads', {
  allowedMimeTypes: ['image/*'],
  maxFileSize: 5 * 1024 * 1024 // 5MB limit
});

// Apply database connection check to all routes
router.use(checkDBConnection);

// Upload single image (Admin only - file uploads should be restricted)
router.post('/image', 
  protect,
  adminOnly,
  upload.single('image'),
  upload.errorHandler,
  (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No image file provided' 
      });
    }

    // Get the S3 URL from the file object (multer-s3 provides location)
    const imageUrl = req.file.location || req.file.key;

    res.json({
      success: true,
      data: {
        filename: req.file.key || req.file.filename,
        originalName: req.file.originalname,
        url: imageUrl,
        size: req.file.size,
        bucket: req.file.bucket,
        location: req.file.location
      },
      message: 'Image uploaded successfully to S3'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Upload multiple images (Admin only - file uploads should be restricted)
router.post('/images', 
  protect,
  adminOnly,
  upload.array('images', 10),
  upload.errorHandler,
  (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No image files provided' 
      });
    }

    const uploadedFiles = req.files.map(file => ({
      filename: file.key || file.filename,
      originalName: file.originalname,
      url: file.location || file.key,
      size: file.size,
      bucket: file.bucket,
      location: file.location
    }));

    res.json({
      success: true,
      data: uploadedFiles,
      message: 'Images uploaded successfully to S3'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router; 