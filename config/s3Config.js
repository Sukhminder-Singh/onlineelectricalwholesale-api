const { S3Client } = require('@aws-sdk/client-s3');

// Ensure environment variables are loaded
if (!process.env.AWS_ACCESS_KEY_ID) {
  require('dotenv').config({ path: './config.env' });
}

// Check if S3 configuration exists
const hasS3Config = !!(
  process.env.AWS_ACCESS_KEY_ID && 
  process.env.AWS_SECRET_ACCESS_KEY && 
  process.env.AWS_REGION && 
  process.env.AWS_BUCKET_NAME
);

// Only log S3 configuration in development mode
if (process.env.NODE_ENV === 'development') {
  console.log('S3 Configuration Check:');
  console.log('- AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET');
  console.log('- AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET');
  console.log('- AWS_REGION:', process.env.AWS_REGION || 'NOT SET');
  console.log('- AWS_BUCKET_NAME:', process.env.AWS_BUCKET_NAME || 'NOT SET');
  console.log('- hasS3Config:', hasS3Config);
}

// Create S3 client only if configuration exists
let s3Client = null;

if (hasS3Config) {
  try {
    s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
      // Add retry configuration
      maxAttempts: 3,
      retryMode: 'adaptive',
      // Add request timeout
      requestTimeout: 30000,
      // Add connection timeout
      connectionTimeout: 5000,
    });

    // Log successful S3 client creation in development
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ S3 client created successfully');
    }
  } catch (error) {
    console.error('❌ Failed to create S3 client:', error.message);
    s3Client = null;
  }
} else {
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️ S3 configuration incomplete - file uploads will use local storage');
  }
}

/**
 * Get the full S3 URL for a file
 * @param {string} filename - The filename to get URL for
 * @returns {string} Full S3 URL or local URL
 */
const getFileUrl = (filename) => {
  if (!filename) return '';
  
  if (hasS3Config && process.env.CLOUDFRONT_DOMAIN) {
    return `${process.env.CLOUDFRONT_DOMAIN}/${filename}`;
  } else if (hasS3Config) {
    return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${filename}`;
  } else {
    // Fallback to local storage URL
    return `/uploads/${filename}`;
  }
};

/**
 * Check if S3 is properly configured and accessible
 * @returns {Promise<boolean>} True if S3 is accessible
 */
const testS3Connection = async () => {
  if (!s3Client || !hasS3Config) {
    return false;
  }

  try {
    const { HeadBucketCommand } = require('@aws-sdk/client-s3');
    await s3Client.send(new HeadBucketCommand({
      Bucket: process.env.AWS_BUCKET_NAME
    }));
    return true;
  } catch (error) {
    console.error('S3 connection test failed:', error.message);
    return false;
  }
};

/**
 * Get S3 configuration status
 * @returns {object} Configuration status object
 */
const getS3Status = () => {
  return {
    configured: hasS3Config,
    clientReady: !!s3Client,
    bucketName: process.env.AWS_BUCKET_NAME || null,
    region: process.env.AWS_REGION || null,
    cloudFrontEnabled: !!process.env.CLOUDFRONT_DOMAIN,
    cloudFrontDomain: process.env.CLOUDFRONT_DOMAIN || null
  };
};

module.exports = {
  s3Client,
  hasS3Config,
  bucketName: process.env.AWS_BUCKET_NAME || '',
  cloudFrontDomain: process.env.CLOUDFRONT_DOMAIN || '',
  getFileUrl,
  testS3Connection,
  getS3Status
};