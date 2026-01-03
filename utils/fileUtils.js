const s3Config = require('../config/s3Config');

/**
 * Generates a full URL for a given filename from S3 or CloudFront.
 * @param {string} filename - The filename or key from the database.
 * @returns {string} The full public URL for the file.
 * @throws {Error} If S3 is not configured
 */
const getFileUrl = (filename) => {
  if (!filename) {
    return '';
  }

  // S3 is required - no local storage fallback
  if (!s3Config.hasS3Config) {
    throw new Error('S3 configuration is required. Please configure AWS S3 credentials.');
  }

  // If it's already a full URL, it's likely an S3 or CloudFront URL.
  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    return filename;
  }
  
  // If using a CloudFront domain, construct the URL.
  if (s3Config.cloudFrontDomain) {
    return `${s3Config.cloudFrontDomain}/${filename}`;
  } 
  
  // For S3 files, construct the full S3 URL from the key.
  return `https://${s3Config.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${filename}`;
};

module.exports = { getFileUrl };
