const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { sendSMS } = require('../utils/sms');
const { logger } = require('../middleware/logger');
const { 
  AuthenticationError, 
  ConflictError,
  NotFoundError,
  ValidationError 
} = require('../middleware/errorHandler');

/**
 * Authentication Service - Handles all authentication-related business logic
 * Implements Strategy Pattern for different authentication methods
 */
class AuthService {
  constructor() {
    this.loginAttempts = new Map();
    this.maxAttempts = 3;
    this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
    // Store pending registrations with OTP data
    this.pendingRegistrations = new Map();
  }

  /**
   * Generate JWT tokens
   * @param {string} userId - User ID
   * @returns {object} Access and refresh tokens
   */
  generateTokens(userId) {
    const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '15m'
    });
    
    const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d'
    });
    
    return { accessToken, refreshToken };
  }

  /**
   * Check and manage login attempts
   * @param {string} identifier - User identifier
   * @returns {object} Attempt information
   */
  checkLoginAttempts(identifier) {
    const attempts = this.loginAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
    const now = Date.now();
    
    // Reset attempts after lockout duration
    if (now - attempts.lastAttempt > this.lockoutDuration) {
      attempts.count = 0;
    }
    
    return attempts;
  }

  /**
   * Record login attempt
   * @param {string} identifier - User identifier
   * @param {boolean} success - Whether login was successful
   */
  recordLoginAttempt(identifier, success) {
    const attempts = this.loginAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
    
    if (success) {
      attempts.count = 0;
    } else {
      attempts.count++;
    }
    
    attempts.lastAttempt = Date.now();
    this.loginAttempts.set(identifier, attempts);
  }

  /**
   * Normalize phone number to E.164 format
   * @param {string} phoneNumber - Phone number to normalize
   * @returns {string|null} Normalized phone number
   */
  normalizePhoneNumber(phoneNumber) {
    if (!phoneNumber || !phoneNumber.trim()) return null;
    return phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
  }

  /**
   * Build user search conditions
   * @param {string} identifier - User identifier (email, username, or phone)
   * @returns {array} MongoDB query conditions
   */
  buildUserSearchConditions(identifier) {
    const phoneRegex = /^\+?[1-9]\d{7,14}$/;
    const isPhone = phoneRegex.test(identifier);
    const normalizedPhone = isPhone ? this.normalizePhoneNumber(identifier) : null;

    const conditions = [
      { email: identifier.toLowerCase?.() ? identifier.toLowerCase() : identifier },
      { username: identifier }
    ];

    if (isPhone) {
      conditions.push({ phoneNumber: normalizedPhone });
    }

    return { conditions, isPhone, normalizedPhone };
  }

  /**
   * Validate user credentials and role
   * @param {string} identifier - User identifier
   * @param {string} password - User password
   * @param {string} requiredRole - Required user role (optional)
   * @returns {object} User object if valid
   */
  async validateCredentials(identifier, password, requiredRole = null) {
    // Check login attempts
    const attempts = this.checkLoginAttempts(identifier);
    if (attempts.count >= this.maxAttempts) {
      const timeLeft = Math.ceil((this.lockoutDuration - (Date.now() - attempts.lastAttempt)) / 1000 / 60);
      throw new AuthenticationError(`Too many failed attempts. Please try again in ${timeLeft} minutes.`);
    }

    // Build search conditions
    const { conditions, isPhone, normalizedPhone } = this.buildUserSearchConditions(identifier);

    // Find user
    const user = await User.findOne({ $or: conditions }).select('+password');

    if (!user || !(await user.correctPassword(password, user.password))) {
      this.recordLoginAttempt(identifier, false);
      throw new AuthenticationError('Incorrect identifier or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AuthenticationError('Your account has been deactivated. Please contact support.');
    }

    // Validate role if required
    if (requiredRole && user.role !== requiredRole) {
      this.recordLoginAttempt(identifier, false);
      throw new AuthenticationError(`Access denied. You don't have ${requiredRole} privileges.`);
    }

    // Reset login attempts on successful validation
    this.recordLoginAttempt(identifier, true);

    return { user, isPhone, normalizedPhone };
  }

  /**
   * Request OTP for customer (handles both login and registration)
   * @param {string|object} identifierOrData - username/email/phone (for login) OR full user data (for registration)
   * @returns {object} info about delivery
   */
  async requestCustomerOtp(identifierOrData) {
    // Check if it's registration data (object with username, email, password, etc.)
    const isRegistrationData = typeof identifierOrData === 'object' && 
                              identifierOrData.username && 
                              identifierOrData.email && 
                              identifierOrData.password;

    if (isRegistrationData) {
      // Handle registration OTP
      return await this.requestRegistrationOtp(identifierOrData);
    }

    // Handle login OTP (existing customer)
    const identifier = identifierOrData;
    const { conditions, isPhone, normalizedPhone } = this.buildUserSearchConditions(identifier);
    const user = await User.findOne({ $or: conditions });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.role !== 'user') {
      throw new AuthenticationError('OTP login is only available for customers');
    }

    if (!user.isActive) {
      throw new AuthenticationError('Your account has been deactivated. Please contact support.');
    }

    const targetPhone = normalizedPhone || user.phoneNumber;
    if (!targetPhone) {
      throw new ValidationError('A verified phone number is required for OTP login');
    }

    // Generate a 6-digit numeric OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    user.loginOtpCode = otp;
    user.loginOtpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
    user.loginOtpAttempts = 0;
    await user.save({ validateBeforeSave: false });

    try {
      const message = `Your login code is ${otp}. It expires in 5 minutes.`;
      const sent = await sendSMS(targetPhone, message);
      if (!sent) {
        throw new Error('Failed to send SMS');
      }
    } catch (e) {
      logger?.warn?.('Failed to send OTP SMS', { userId: user._id, error: e.message });
      // Don't expose SMS provider errors to client
    }

    return { to: targetPhone, via: 'sms' };
  }

  /**
   * Verify OTP for customer (handles both login and registration)
   * @param {string|object} identifierOrData - username/email/phone (for login) OR full user data (for registration)
   * @param {string} otp - 6-digit code
   * @returns {object} user and tokens
   */
  async verifyCustomerOtp(identifierOrData, otp) {
    // Check if it's registration data (object with username, email, password, etc.)
    const isRegistrationData = typeof identifierOrData === 'object' && 
                              identifierOrData.username && 
                              identifierOrData.email && 
                              identifierOrData.password;

    if (isRegistrationData) {
      // Handle registration OTP verification
      const user = await this.verifyRegistrationOtp(identifierOrData, otp);
      const { accessToken, refreshToken } = this.generateTokens(user._id);
      return { user, accessToken, refreshToken };
    }

    // Handle login OTP verification (existing customer)
    const identifier = identifierOrData;
    const { conditions } = this.buildUserSearchConditions(identifier);
    const user = await User.findOne({ $or: conditions });

    if (!user) {
      throw new AuthenticationError('Invalid code');
    }

    if (user.role !== 'user') {
      throw new AuthenticationError('OTP login is only available for customers');
    }

    if (!user.isActive) {
      throw new AuthenticationError('Your account has been deactivated. Please contact support.');
    }

    // Validate OTP
    const now = Date.now();
    if (!user.loginOtpCode || !user.loginOtpExpires || now > user.loginOtpExpires) {
      throw new AuthenticationError('Code expired. Please request a new one.');
    }

    // Basic attempt throttling
    if (user.loginOtpAttempts >= 5) {
      throw new AuthenticationError('Too many invalid attempts. Request a new code.');
    }

    if (String(otp) !== String(user.loginOtpCode)) {
      user.loginOtpAttempts = (user.loginOtpAttempts || 0) + 1;
      await user.save({ validateBeforeSave: false });
      throw new AuthenticationError('Invalid code');
    }

    // Success: clear OTP fields and update last login
    user.loginOtpCode = undefined;
    user.loginOtpExpires = undefined;
    user.loginOtpAttempts = 0;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const { accessToken, refreshToken } = this.generateTokens(user._id);
    return { user, accessToken, refreshToken };
  }

  /**
   * Request OTP for new customer registration
   * @param {object} userData - User registration data
   * @returns {object} info about delivery
   */
  async requestRegistrationOtp(userData) {
    const { username, email, phoneNumber } = userData;

    // Normalize phone number
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

    if (!normalizedPhone) {
      throw new ValidationError('Phone number is required for OTP registration');
    }

    // Build conditions to check for existing user
    const orConditions = [{ email }, { username }];
    if (normalizedPhone) {
      orConditions.push({ phoneNumber: normalizedPhone });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: orConditions });

    if (existingUser) {
      let message = 'User already exists';
      if (existingUser.email === email) {
        message = 'Email already registered';
      } else if (existingUser.username === username) {
        message = 'Username already taken';
      } else if (existingUser.phoneNumber === normalizedPhone) {
        message = 'Phone number already registered';
      }
      throw new ConflictError(message);
    }

    // Generate a 6-digit numeric OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    // Store pending registration with OTP (expires in 10 minutes)
    const registrationKey = `${email}_${normalizedPhone}`;
    this.pendingRegistrations.set(registrationKey, {
      ...userData,
      phoneNumber: normalizedPhone,
      otp,
      otpExpires: Date.now() + 10 * 60 * 1000, // 10 minutes
      otpAttempts: 0,
      createdAt: Date.now()
    });

    // Clean up expired registrations (older than 15 minutes)
    this.cleanupExpiredRegistrations();

    try {
      const message = `Your registration code is ${otp}. It expires in 10 minutes.`;
      const sent = await sendSMS(normalizedPhone, message);
      if (!sent) {
        throw new Error('Failed to send SMS');
      }
    } catch (e) {
      logger?.warn?.('Failed to send registration OTP SMS', { email, error: e.message });
      // Remove the pending registration if SMS fails
      this.pendingRegistrations.delete(registrationKey);
      // Don't expose SMS provider errors to client
    }

    return { to: normalizedPhone, via: 'sms' };
  }

  /**
   * Verify OTP and complete registration
   * @param {object} userData - User registration data
   * @param {string} otp - 6-digit code
   * @returns {object} Created user
   */
  async verifyRegistrationOtp(userData, otp) {
    const { email, phoneNumber } = userData;
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

    if (!normalizedPhone) {
      throw new ValidationError('Phone number is required');
    }

    const registrationKey = `${email}_${normalizedPhone}`;
    const pendingRegistration = this.pendingRegistrations.get(registrationKey);

    if (!pendingRegistration) {
      throw new AuthenticationError('No pending registration found. Please request a new OTP.');
    }

    // Check if OTP expired
    const now = Date.now();
    if (now > pendingRegistration.otpExpires) {
      this.pendingRegistrations.delete(registrationKey);
      throw new AuthenticationError('OTP expired. Please request a new one.');
    }

    // Check attempt limit
    if (pendingRegistration.otpAttempts >= 5) {
      this.pendingRegistrations.delete(registrationKey);
      throw new AuthenticationError('Too many invalid attempts. Please request a new OTP.');
    }

    // Verify OTP
    if (String(otp) !== String(pendingRegistration.otp)) {
      pendingRegistration.otpAttempts++;
      this.pendingRegistrations.set(registrationKey, pendingRegistration);
      throw new AuthenticationError('Invalid OTP code');
    }

    // OTP verified - create the user
    const { username, password, firstName, lastName } = pendingRegistration;

    // Double-check user doesn't exist (race condition protection)
    const orConditions = [{ email }, { username }];
    if (normalizedPhone) {
      orConditions.push({ phoneNumber: normalizedPhone });
    }

    const existingUser = await User.findOne({ $or: orConditions });
    if (existingUser) {
      this.pendingRegistrations.delete(registrationKey);
      let message = 'User already exists';
      if (existingUser.email === email) {
        message = 'Email already registered';
      } else if (existingUser.username === username) {
        message = 'Username already taken';
      } else if (existingUser.phoneNumber === normalizedPhone) {
        message = 'Phone number already registered';
      }
      throw new ConflictError(message);
    }

    // Create user data
    const newUserData = {
      username,
      email,
      password,
      firstName,
      lastName,
      phoneNumber: normalizedPhone
    };

    // Remove pending registration
    this.pendingRegistrations.delete(registrationKey);

    // Create the user
    return await User.create(newUserData);
  }

  /**
   * Clean up expired pending registrations
   */
  cleanupExpiredRegistrations() {
    const now = Date.now();
    const maxAge = 15 * 60 * 1000; // 15 minutes

    for (const [key, registration] of this.pendingRegistrations.entries()) {
      if (now - registration.createdAt > maxAge || now > registration.otpExpires) {
        this.pendingRegistrations.delete(key);
      }
    }
  }

  /**
   * Register a new user (without OTP verification)
   * @param {object} userData - User registration data (fullName, email, password, phoneNumber)
   * @returns {object} Created user
   */
  async registerUser(userData) {
    const { fullName, email, password, phoneNumber } = userData;

    // Validate required fields
    if (!fullName || !email || !password || !phoneNumber) {
      throw new ValidationError('fullName, email, password, and phoneNumber are required');
    }

    // Normalize phone number
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      throw new ValidationError('Phone number is required and must be valid');
    }

    // Split fullName into firstName and lastName
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    if (!firstName) {
      throw new ValidationError('Full name must contain at least a first name');
    }

    // Check if email or phone already exists
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { phoneNumber: normalizedPhone }
      ]
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        throw new ConflictError('Email already registered');
      } else if (existingUser.phoneNumber === normalizedPhone) {
        throw new ConflictError('Phone number already registered');
      }
    }

    // Generate unique username from email prefix
    const emailPrefix = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
    let username;
    let attempts = 0;
    
    // Ensure username is unique and meets length requirements (3-30 chars)
    do {
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const suffix = `${timestamp}${random}`;
      
      // Calculate max prefix length to keep total under 30 chars
      const maxPrefixLength = Math.min(20, 30 - suffix.length - 1);
      const prefix = emailPrefix.slice(0, maxPrefixLength);
      
      // Ensure minimum length of 3
      if (prefix.length < 3) {
        username = `user_${suffix}`;
      } else {
        username = `${prefix}_${suffix}`;
      }
      
      // Check if username already exists
      const usernameExists = await User.findOne({ username });
      if (!usernameExists) {
        break;
      }
      
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      throw new Error('Unable to generate unique username. Please try again.');
    }

    // Create user data
    const newUserData = {
      username,
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      phoneNumber: normalizedPhone
    };

    return await User.create(newUserData);
  }

  /**
   * Create admin user
   * @param {object} adminData - Admin user data
   * @returns {object} Created admin user
   */
  async createAdmin(adminData) {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      throw new ConflictError('Admin user already exists');
    }

    const { username, email, password, firstName, lastName, phoneNumber } = adminData;
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

    // Build conditions to check for existing user
    const orConditions = [{ email }, { username }];
    if (normalizedPhone) {
      orConditions.push({ phoneNumber: normalizedPhone });
    }

    const existingUser = await User.findOne({ $or: orConditions });

    if (existingUser) {
      let message = 'User already exists';
      if (existingUser.email === email) {
        message = 'Email already registered';
      } else if (existingUser.username === username) {
        message = 'Username already taken';
      } else if (existingUser.phoneNumber === normalizedPhone) {
        message = 'Phone number already registered';
      }
      throw new ConflictError(message);
    }

    // Create admin data
    const newAdminData = {
      username,
      email,
      password,
      firstName,
      lastName
    };

    if (normalizedPhone) {
      newAdminData.phoneNumber = normalizedPhone;
    }

    return await User.createAdmin(newAdminData);
  }

  /**
   * Send login SMS notification
   * @param {object} user - User object
   * @param {boolean} isPhone - Whether login was via phone
   */
  async sendLoginSMS(user, isPhone) {
    if (isPhone && user.phoneNumber && (user.role === 'user' || user.role === 'customer')) {
      try {
        const message = `Hi ${user.firstName || user.username}, you have successfully logged in at ${new Date().toLocaleString()}. If this wasn't you, please secure your account.`;
        await sendSMS(user.phoneNumber, message);
        logger?.info?.('Login SMS sent', { userId: user._id, phoneNumber: user.phoneNumber });
      } catch (smsError) {
        logger?.warn?.('Failed to send login SMS', { error: smsError.message, userId: user._id });
      }
    }
  }

  /**
   * Update user's last login timestamp
   * @param {object} user - User object
   */
  async updateLastLogin(user) {
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
  }

  /**
   * Generate password reset token
   * @param {string} email - User email
   * @returns {object} Reset token info
   */
  async generatePasswordResetToken(email) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if user exists for security
      return { exists: false };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save({ validateBeforeSave: false });

    return { exists: true, resetToken, user };
  }

  /**
   * Reset password with token
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {object} Updated user
   */
  async resetPassword(token, newPassword) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      throw new AuthenticationError('Invalid or expired reset token');
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return user;
  }

  /**
   * Refresh access token
   * @param {string} refreshToken - Refresh token
   * @returns {object} New tokens
   */
  async refreshAccessToken(refreshToken) {
    if (!refreshToken) {
      throw new AuthenticationError('Refresh token not provided');
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      throw new AuthenticationError('User not found or inactive');
    }

    return this.generateTokens(user._id);
  }
}

module.exports = new AuthService();
