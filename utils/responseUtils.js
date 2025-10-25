/**
 * Utility functions for standardized API responses
 */

/**
 * Send success response
 * @param {object} res - Express response object
 * @param {object} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  const response = {
    success: true,
    message
  };

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send error response
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 400)
 * @param {object} errors - Validation errors (optional)
 */
const sendError = (res, message = 'An error occurred', statusCode = 400, errors = null) => {
  const response = {
    success: false,
    message
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send paginated response
 * @param {object} res - Express response object
 * @param {array} data - Response data array
 * @param {object} pagination - Pagination info
 * @param {string} message - Success message
 */
const sendPaginatedResponse = (res, data, pagination, message = 'Success') => {
  return res.json({
    success: true,
    message,
    data,
    pagination
  });
};

/**
 * Create pagination object
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total items
 * @returns {object} Pagination object
 */
const createPagination = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    currentPage: parseInt(page),
    totalPages,
    totalItems: total,
    itemsPerPage: parseInt(limit),
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null
  };
};

/**
 * Build MongoDB filter object from query parameters
 * @param {object} query - Request query object
 * @param {array} allowedFilters - Array of allowed filter fields
 * @returns {object} MongoDB filter object
 */
const buildFilter = (query, allowedFilters = []) => {
  const filter = {};

  allowedFilters.forEach(field => {
    if (query[field] !== undefined) {
      if (field === 'search') {
        // Handle search across multiple fields
        filter.$or = [
          { name: { $regex: query[field], $options: 'i' } },
          { description: { $regex: query[field], $options: 'i' } }
        ];
      } else if (field === 'minPrice' || field === 'maxPrice') {
        // Handle price range
        if (!filter.price) filter.price = {};
        if (field === 'minPrice') filter.price.$gte = parseFloat(query[field]);
        if (field === 'maxPrice') filter.price.$lte = parseFloat(query[field]);
      } else if (field === 'categories' && query[field]) {
        // Handle array fields
        filter.categories = { $in: Array.isArray(query[field]) ? query[field] : [query[field]] };
      } else {
        filter[field] = query[field];
      }
    }
  });

  return filter;
};

/**
 * Build MongoDB sort object from query parameters
 * @param {string} sortQuery - Sort query string (e.g., '-createdAt,name')
 * @param {string} defaultSort - Default sort string
 * @returns {object} MongoDB sort object
 */
const buildSort = (sortQuery, defaultSort = '-createdAt') => {
  const sortStr = sortQuery || defaultSort;
  const sortObj = {};

  sortStr.split(',').forEach(field => {
    const trimmedField = field.trim();
    if (trimmedField.startsWith('-')) {
      sortObj[trimmedField.substring(1)] = -1;
    } else {
      sortObj[trimmedField] = 1;
    }
  });

  return sortObj;
};

/**
 * Sanitize object by removing undefined/null values
 * @param {object} obj - Object to sanitize
 * @returns {object} Sanitized object
 */
const sanitizeObject = (obj) => {
  const sanitized = {};
  
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined && obj[key] !== null) {
      if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        const nested = sanitizeObject(obj[key]);
        if (Object.keys(nested).length > 0) {
          sanitized[key] = nested;
        }
      } else {
        sanitized[key] = obj[key];
      }
    }
  });

  return sanitized;
};

/**
 * Generate unique filename with timestamp
 * @param {string} originalName - Original filename
 * @returns {string} Unique filename
 */
const generateUniqueFilename = (originalName) => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  const extension = originalName.split('.').pop();
  return `${timestamp}-${random}.${extension}`;
};

/**
 * Validate file type
 * @param {string} filename - Filename to validate
 * @param {array} allowedTypes - Array of allowed file extensions
 * @returns {boolean} True if file type is allowed
 */
const isValidFileType = (filename, allowedTypes = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx']) => {
  const extension = filename.split('.').pop().toLowerCase();
  return allowedTypes.includes(extension);
};

/**
 * Format file size in human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Generate random string
 * @param {number} length - Length of random string
 * @param {string} charset - Character set to use
 * @returns {string} Random string
 */
const generateRandomString = (length = 10, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') => {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
};

/**
 * Deep clone object
 * @param {object} obj - Object to clone
 * @returns {object} Cloned object
 */
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const cloned = {};
    Object.keys(obj).forEach(key => {
      cloned[key] = deepClone(obj[key]);
    });
    return cloned;
  }
};

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 * @param {any} value - Value to check
 * @returns {boolean} True if value is empty
 */
const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && Object.keys(value).length === 0) return true;
  return false;
};

/**
 * Capitalize first letter of string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
const capitalize = (str) => {
  if (!str || typeof str !== 'string') return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Convert string to slug (URL-friendly)
 * @param {string} str - String to convert
 * @returns {string} Slug string
 */
const slugify = (str) => {
  if (!str || typeof str !== 'string') return '';
  
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

module.exports = {
  sendSuccess,
  sendError,
  sendPaginatedResponse,
  createPagination,
  buildFilter,
  buildSort,
  sanitizeObject,
  generateUniqueFilename,
  isValidFileType,
  formatFileSize,
  generateRandomString,
  deepClone,
  isEmpty,
  capitalize,
  slugify
};