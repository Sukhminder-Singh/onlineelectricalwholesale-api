const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');

// Create a function to generate the multer upload middleware with dynamic folder
const createUploadMiddleware = (folderName) => {
// Check if S3 configuration is available
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION || !process.env.AWS_BUCKET_NAME) {
  console.error('❌ S3 configuration missing. Please check your environment variables:');
  console.error('- AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET');
  console.error('- AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET');
  console.error('- AWS_REGION:', process.env.AWS_REGION || 'NOT SET');
  console.error('- AWS_BUCKET_NAME:', process.env.AWS_BUCKET_NAME || 'NOT SET');
  throw new Error('S3 configuration is incomplete. Please check your environment variables.');
}

const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  },
  region: process.env.AWS_REGION,
  forcePathStyle: false,
  endpoint: `https://s3.${process.env.AWS_REGION}.amazonaws.com`
});

// Configure multer for S3
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      // Use the provided folder name
      cb(null, `${folderName}/${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE
  }),
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: process.env.MAX_FILE_SIZE || 5 * 1024 * 1024 // 5MB limit
  }
});

// Add error handling middleware
upload.errorHandler = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.',
        error: 'FILE_TOO_LARGE'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files uploaded.',
        error: 'TOO_MANY_FILES'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field name for file upload.',
        error: 'UNEXPECTED_FIELD'
      });
    }
  }
  
  if (error.message === 'Only image files are allowed!') {
    return res.status(400).json({
      success: false,
      message: 'Only image files are allowed.',
      error: 'INVALID_FILE_TYPE'
    });
  }
  
  console.error('Upload error:', error);
  res.status(500).json({
    success: false,
    message: 'File upload failed.',
    error: error.message
  });
};

  return upload;
};

module.exports = createUploadMiddleware;