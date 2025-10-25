/**
 * Response Service - Provides unified response formatting
 * Implements consistent API response structure across the application
 */
class ResponseService {
  /**
   * Send success response
   * @param {object} res - Express response object
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Success message
   * @param {object} data - Response data
   * @param {object} meta - Additional metadata (pagination, etc.)
   */
  success(res, statusCode = 200, message = 'Success', data = null, meta = null) {
    const response = {
      success: true,
      message,
      ...(data && { data }),
      ...(meta && { meta })
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send error response
   * @param {object} res - Express response object
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error message
   * @param {object} errors - Detailed error information
   */
  error(res, statusCode = 500, message = 'Internal Server Error', errors = null) {
    const response = {
      success: false,
      message,
      ...(errors && { errors })
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send authentication success response with tokens
   * @param {object} res - Express response object
   * @param {object} user - User object
   * @param {string} accessToken - Access token
   * @param {string} refreshToken - Refresh token
   * @param {string} message - Success message
   */
  authSuccess(res, user, accessToken, refreshToken, message = 'Authentication successful') {
    // Set refresh token as HTTP-only cookie
    const cookieOptions = {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };

    res.cookie('refreshToken', refreshToken, cookieOptions);

    // Remove password from user object
    const userResponse = { ...user.toObject() };
    delete userResponse.password;

    return this.success(res, 200, message, {
      user: userResponse,
      accessToken,
      expiresIn: process.env.JWT_EXPIRE || '15m'
    });
  }

  /**
   * Send paginated response
   * @param {object} res - Express response object
   * @param {array} data - Array of data items
   * @param {object} pagination - Pagination information
   * @param {string} message - Success message
   */
  paginated(res, data, pagination, message = 'Data retrieved successfully') {
    return this.success(res, 200, message, data, { pagination });
  }

  /**
   * Send created response
   * @param {object} res - Express response object
   * @param {object} data - Created resource data
   * @param {string} message - Success message
   */
  created(res, data, message = 'Resource created successfully') {
    return this.success(res, 201, message, data);
  }

  /**
   * Send updated response
   * @param {object} res - Express response object
   * @param {object} data - Updated resource data
   * @param {string} message - Success message
   */
  updated(res, data, message = 'Resource updated successfully') {
    return this.success(res, 200, message, data);
  }

  /**
   * Send deleted response
   * @param {object} res - Express response object
   * @param {string} message - Success message
   */
  deleted(res, message = 'Resource deleted successfully') {
    return this.success(res, 200, message);
  }

  /**
   * Send no content response
   * @param {object} res - Express response object
   */
  noContent(res) {
    return res.status(204).send();
  }

  /**
   * Send validation error response
   * @param {object} res - Express response object
   * @param {array} errors - Validation errors
   */
  validationError(res, errors) {
    return this.error(res, 400, 'Validation failed', errors);
  }

  /**
   * Send unauthorized response
   * @param {object} res - Express response object
   * @param {string} message - Error message
   */
  unauthorized(res, message = 'Unauthorized access') {
    return this.error(res, 401, message);
  }

  /**
   * Send forbidden response
   * @param {object} res - Express response object
   * @param {string} message - Error message
   */
  forbidden(res, message = 'Access forbidden') {
    return this.error(res, 403, message);
  }

  /**
   * Send not found response
   * @param {object} res - Express response object
   * @param {string} message - Error message
   */
  notFound(res, message = 'Resource not found') {
    return this.error(res, 404, message);
  }

  /**
   * Send conflict response
   * @param {object} res - Express response object
   * @param {string} message - Error message
   */
  conflict(res, message = 'Resource conflict') {
    return this.error(res, 409, message);
  }
}

module.exports = new ResponseService();
