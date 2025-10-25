const s3Config = require('../config/s3Config');

/**
 * Generates a full URL for a given filename, considering S3, CloudFront, or local storage.
 * @param {string} filename - The filename or key from the database.
 * @returns {string} The full public URL for the file.
 */
const getFileUrl = (filename) => {
  if (!filename) {
    return '';
  }

  // If S3 is configured and enabled
  if (s3Config.hasS3Config) {
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
  } 
  
  // Fallback for local storage if S3 is not configured.
  else {
    // If it's already a full URL, return as is.
    if (filename.startsWith('http://') || filename.startsWith('https://')) {
      return filename;
    }
    // Construct a full URL for local files.
    const host = process.env.HOST || `http://localhost:${process.env.PORT || 5000}`;
    return `${host}/uploads/${filename.replace(/^\/?uploads\//, '')}`;
  }
};

module.exports = { getFileUrl };
