const { validationResult } = require('express-validator');
const AuthService = require('../services/AuthService');
const UserService = require('../services/UserService');
const ResponseService = require('../services/ResponseService');
const { logger } = require('../middleware/logger');

const { 
  ValidationError, 
  AuthenticationError,
  asyncHandler 
} = require('../middleware/errorHandler');

// Helper function to send authentication response
const createSendToken = async (user, statusCode, res, message = 'Authentication successful') => {
  const { accessToken, refreshToken } = AuthService.generateTokens(user._id);
  
  // Populate addresses for the user
  await user.populate('addresses');
  
  return ResponseService.authSuccess(res, user, accessToken, refreshToken, message);
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const user = await AuthService.registerUser(req.body);
  await createSendToken(user, 201, res, 'User registered successfully. Please check your email for OTP verification.');
});



// @desc    Role-based login user
// @route   POST /api/auth/login
// @access  Public
exports.loginWithRole = asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { identifier, password, role } = req.body;

  if (!identifier || !password || !role) {
    throw new ValidationError('Please provide identifier (username, email, or phone number), password, and role');
  }

  const { user, isPhone } = await AuthService.validateCredentials(identifier, password, role);
  
  // Update last login
  await AuthService.updateLastLogin(user);
  
  // Send SMS notification if applicable
  await AuthService.sendLoginSMS(user, isPhone);

  await createSendToken(user, 200, res);
});

// @desc    Admin login
// @route   POST /api/auth/admin/login
// @access  Public
exports.adminLogin = asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { identifier, password } = req.body;

  if (!identifier || !password) {
    throw new ValidationError('Please provide identifier (username, email, or phone number) and password');
  }

  const { user } = await AuthService.validateCredentials(identifier, password, 'admin');
  
  // Update last login
  await AuthService.updateLastLogin(user);

  await createSendToken(user, 200, res);
});

// @desc    Customer login
// @route   POST /api/auth/customer/login
// @access  Public
exports.customerLogin = asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { identifier, password } = req.body;

  if (!identifier || !password) {
    throw new ValidationError('Please provide identifier (username, email, or phone number) and password');
  }

  const { user, isPhone } = await AuthService.validateCredentials(identifier, password, 'user');
  
  // Update last login
  await AuthService.updateLastLogin(user);
  
  // Send SMS notification if applicable
  await AuthService.sendLoginSMS(user, isPhone);

  await createSendToken(user, 200, res);
});

// @desc    Request OTP for customer (handles both login and registration)
// @route   POST /api/auth/customer/request-otp
// @access  Public
exports.requestCustomerOtp = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  // Check if it's registration data (has username, email, password) or login (just identifier)
  const { identifier, username, email, password, firstName, lastName, phoneNumber } = req.body;
  
  const isRegistration = username && email && password;
  
  let requestData;
  if (isRegistration) {
    // Registration OTP - validate all fields
    if (!firstName || !lastName || !phoneNumber) {
      throw new ValidationError('For registration, please provide username, email, password, firstName, lastName, and phoneNumber');
    }
    requestData = { username, email, password, firstName, lastName, phoneNumber };
  } else {
    // Login OTP - just identifier
    if (!identifier) {
      throw new ValidationError('Please provide username, email, or phone number (for login) OR full registration data (username, email, password, firstName, lastName, phoneNumber)');
    }
    requestData = identifier;
  }

  const info = await AuthService.requestCustomerOtp(requestData);
  const message = isRegistration 
    ? 'OTP sent to your phone number for registration' 
    : 'OTP sent if the account exists and supports OTP login';
  
  return ResponseService.success(res, 200, message, info);
});

// @desc    Verify OTP for customer (handles both login and registration)
// @route   POST /api/auth/customer/verify-otp
// @access  Public
exports.verifyCustomerOtp = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { identifier, otp, username, email, password, firstName, lastName, phoneNumber } = req.body;
  
  if (!otp) {
    throw new ValidationError('OTP code is required');
  }

  // Check if it's registration data (has username, email, password) or login (just identifier)
  const isRegistration = username && email && password;
  
  let requestData;
  if (isRegistration) {
    // Registration OTP verification
    if (!firstName || !lastName || !phoneNumber) {
      throw new ValidationError('For registration, please provide username, email, password, firstName, lastName, and phoneNumber');
    }
    requestData = { username, email, password, firstName, lastName, phoneNumber };
  } else {
    // Login OTP verification
    if (!identifier) {
      throw new ValidationError('Please provide identifier (for login) OR full registration data with OTP');
    }
    requestData = identifier;
  }

  const { user, accessToken, refreshToken } = await AuthService.verifyCustomerOtp(requestData, otp);
  const message = isRegistration 
    ? 'Registration successful. Welcome!' 
    : 'Logged in successfully';
  
  return ResponseService.authSuccess(res, user, accessToken, refreshToken, message);
});

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
exports.refreshToken = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.cookies;
  
  const { accessToken, refreshToken: newRefreshToken } = await AuthService.refreshAccessToken(refreshToken);

  // Set new refresh token
  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  res.cookie('refreshToken', newRefreshToken, cookieOptions);

  return ResponseService.success(res, 200, 'Token refreshed successfully', {
    accessToken,
    expiresIn: process.env.JWT_EXPIRE || '15m'
  });
});

// @desc    Request password reset
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    throw new ValidationError('Please provide an email address');
  }

  const result = await AuthService.generatePasswordResetToken(email);
  
  if (result.exists) {
    // TODO: Send email with reset link
    // For now, just log the token (remove in production)
    console.log(`🔑 Password reset requested for: ${email}, Token: ${result.resetToken}`);
  }

  return ResponseService.success(res, 200, 'If an account with that email exists, a password reset link has been sent.');
});

// @desc    Reset password with token
// @route   PUT /api/auth/reset-password
// @access  Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    throw new ValidationError('Token and new password are required');
  }

  const user = await AuthService.resetPassword(token, newPassword);
  createSendToken(user, 200, res, 'Password reset successfully');
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await UserService.getUserById(req.user.id);
  return ResponseService.success(res, 200, 'User profile retrieved successfully', { user });
});

// @desc    Update user profile
// @route   PUT /api/auth/update-profile
// @access  Private
exports.updateProfile = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const updatedUser = await UserService.updateProfile(req.user.id, req.body);
  return ResponseService.success(res, 200, 'Profile updated successfully', { user: updatedUser });
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { currentPassword, newPassword } = req.body;
  const user = await UserService.changePassword(req.user.id, currentPassword, newPassword);
  createSendToken(user, 200, res, 'Password changed successfully');
});

// @desc    Deactivate account (user can only deactivate their own account)
// @route   PUT /api/auth/deactivate
// @access  Private
exports.deactivateAccount = asyncHandler(async (req, res, next) => {
  const { userId } = req.body;

  if (!userId) {
    throw new ValidationError('User ID is required to deactivate account');
  }

  const result = await UserService.deactivateAccount(userId);
  return ResponseService.success(res, 200, 'Account deactivated successfully', result);
});

// @desc    Admin reactivate user account
// @route   PUT /api/auth/admin/reactivate/:userId
// @access  Private (Admin only)
exports.adminReactivateUser = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const { reason } = req.body;

  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  const result = await UserService.reactivateAccount(userId, req.user.id, reason);
  return ResponseService.success(res, 200, `User account has been reactivated successfully`, result);
});

// @desc    Get all users (Admin only)
// @route   GET /api/auth/admin/users
// @access  Private (Admin only)
exports.getAllUsers = asyncHandler(async (req, res, next) => {
  const result = await UserService.getAllUsers(req.query);
  return ResponseService.success(res, 200, 'Users retrieved successfully', result.users);
});

// @desc    Get user details by ID (Admin only)
// @route   GET /api/auth/admin/users/:userId
// @access  Private (Admin only)
exports.getUserById = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const user = await UserService.getUserById(userId);
  return ResponseService.success(res, 200, 'User details retrieved successfully', { user });
});

// @desc    Get user statistics (Admin only)
// @route   GET /api/auth/admin/users/stats
// @access  Private (Admin only)
exports.getUserStats = asyncHandler(async (req, res, next) => {
  const stats = await UserService.getUserStats();
  return ResponseService.success(res, 200, 'User statistics retrieved successfully', stats);
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res, next) => {
  // Clear refresh token cookie
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });

  return ResponseService.success(res, 200, 'Logged out successfully');
});

// @desc    Create admin user (for initial setup)
// @route   POST /api/auth/create-admin
// @access  Public (should be protected in production)
exports.createAdmin = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const adminUser = await AuthService.createAdmin(req.body);
  await createSendToken(adminUser, 201, res, 'Admin user created successfully');
});

// @desc    Verify email with OTP
// @route   POST /api/auth/verify-email
// @access  Public
exports.verifyEmail = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new ValidationError('Email and OTP are required');
  }

  const user = await AuthService.verifyEmailOtp(email, otp);
  return ResponseService.success(res, 200, 'Email verified successfully', { 
    user: {
      id: user._id,
      email: user.email,
      emailVerified: user.emailVerified
    }
  });
});

// @desc    Resend email verification OTP
// @route   POST /api/auth/resend-email-otp
// @access  Public
exports.resendEmailOtp = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { email } = req.body;

  if (!email) {
    throw new ValidationError('Email is required');
  }

  const result = await AuthService.resendEmailOtp(email);
  
  if (result.sent) {
    return ResponseService.success(res, 200, result.message);
  } else {
    return ResponseService.success(res, 200, result.message);
  }
});