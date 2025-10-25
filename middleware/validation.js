const { body, param } = require('express-validator');
const { validationResult } = require('express-validator');

// Validation rules for registration
exports.registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),
  
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),
  
  body('phoneNumber')
    .optional()
    .trim()
    .matches(/^\+?[1-9]\d{7,14}$/)
    .withMessage('Please enter a valid phone number in international format (e.g., +1234567890)')
    .customSanitizer(value => {
      // Normalize phone number to E.164 format
      if (value && !value.startsWith('+')) {
        return `+${value}`;
      }
      return value;
    })
];


// Validation rules for role-based login
exports.roleBasedLoginValidation = [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('Please provide username, email, or phone number'),
  
  body('password')
    .notEmpty()
    .withMessage('Please provide password'),
  
  body('role')
    .isIn(['admin', 'user'])
    .withMessage('Role must be either admin or user')
];

// Validation rules for admin login
exports.adminLoginValidation = [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('Please provide username, email, or phone number'),
  
  body('password')
    .notEmpty()
    .withMessage('Please provide password')
];

// Validation rules for customer login
exports.customerLoginValidation = [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('Please provide username, email, or phone number'),
  
  body('password')
    .notEmpty()
    .withMessage('Please provide password')
];

// Validation rules for requesting customer login OTP
exports.customerRequestOtpValidation = [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('Please provide username, email, or phone number')
];

// Validation rules for verifying customer login OTP
exports.customerVerifyOtpValidation = [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('Please provide username, email, or phone number'),
  
  body('otp')
    .trim()
    .notEmpty()
    .withMessage('OTP code is required')
    .isLength({ min: 4, max: 8 })
    .withMessage('OTP code length looks invalid')
    .matches(/^\d+$/)
    .withMessage('OTP must be numeric')
];

// Validation rules for profile update
exports.updateProfileValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),
  
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('phoneNumber')
    .optional()
    .trim()
    .matches(/^\+?[1-9]\d{7,14}$/)
    .withMessage('Please enter a valid phone number in international format (e.g., +1234567890)')
    .customSanitizer(value => {
      // Normalize phone number to E.164 format
      if (value && !value.startsWith('+')) {
        return `+${value}`;
      }
      return value;
    })
];

// Validation rules for password change
exports.changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    })
];

// Validation rules for admin creation
exports.createAdminValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),
  
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),
  
  body('phoneNumber')
    .optional()
    .trim()
    .matches(/^\+?[1-9]\d{7,14}$/)
    .withMessage('Please enter a valid phone number in international format (e.g., +1234567890)')
    .customSanitizer(value => {
      // Normalize phone number to E.164 format
      if (value && !value.startsWith('+')) {
        return `+${value}`;
      }
      return value;
    })
];

// Validation rules for creating customers (admin only)
exports.createCustomerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),
  
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),
  
  body('phoneNumber')
    .optional()
    .trim()
    .matches(/^\+?[1-9]\d{7,14}$/)
    .withMessage('Please enter a valid phone number in international format (e.g., +1234567890)')
    .customSanitizer(value => {
      // Normalize phone number to E.164 format
      if (value && !value.startsWith('+')) {
        return `+${value}`;
      }
      return value;
    })
];

// Validation rules for forgot password
exports.forgotPasswordValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
];

// Validation rules for reset password
exports.resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required')
    .isLength({ min: 64, max: 64 })
    .withMessage('Invalid reset token format'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
];

// Validation rules for account deactivation
exports.deactivateAccountValidation = [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required to deactivate account')
    .isMongoId()
    .withMessage('Valid user ID is required')
];



// Validation rules for attribute creation
exports.createAttributeValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Attribute name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Attribute name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Attribute name can only contain letters, numbers, spaces, hyphens, and underscores'),
  
  body('type')
    .isIn(['text', 'number', 'select'])
    .withMessage('Type must be one of: text, number, select'),
  
  body('options')
    .optional()
    .isArray()
    .withMessage('Options must be an array')
    .custom((options, { req }) => {
      if (req.body.type === 'select') {
        if (!Array.isArray(options) || options.length === 0) {
          throw new Error('Options are required for select type attributes');
        }
        
        // Validate each option
        options.forEach((option, index) => {
          if (typeof option !== 'string' || option.trim().length === 0) {
            throw new Error(`Option ${index + 1} cannot be empty`);
          }
          if (option.trim().length > 100) {
            throw new Error(`Option ${index + 1} must be less than 100 characters`);
          }
        });
        
        // Check for duplicate options
        const uniqueOptions = [...new Set(options.map(opt => opt.trim().toLowerCase()))];
        if (uniqueOptions.length !== options.length) {
          throw new Error('Duplicate options are not allowed');
        }
      }
      return true;
    }),
  
  body('isRequired')
    .optional()
    .isBoolean()
    .withMessage('isRequired must be a boolean'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  
  body('validation')
    .optional()
    .isObject()
    .withMessage('Validation must be an object'),
  
  body('validation.minLength')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('minLength must be a positive integer between 1 and 1000'),
  
  body('validation.maxLength')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('maxLength must be a positive integer between 1 and 1000'),
  
  body('validation.minValue')
    .optional()
    .isNumeric()
    .withMessage('minValue must be a number'),
  
  body('validation.maxValue')
    .optional()
    .isNumeric()
    .withMessage('maxValue must be a number'),
  
  body('validation.pattern')
    .optional()
    .isString()
    .withMessage('pattern must be a string')
];

// Validation rules for attribute update
exports.updateAttributeValidation = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Attribute name cannot be empty')
    .isLength({ min: 2, max: 100 })
    .withMessage('Attribute name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Attribute name can only contain letters, numbers, spaces, hyphens, and underscores'),
  
  body('type')
    .optional()
    .isIn(['text', 'number', 'select'])
    .withMessage('Type must be one of: text, number, select'),
  
  body('options')
    .optional()
    .isArray()
    .withMessage('Options must be an array')
    .custom((options, { req }) => {
      if (req.body.type === 'select') {
        if (!Array.isArray(options) || options.length === 0) {
          throw new Error('Options are required for select type attributes');
        }
        
        // Validate each option
        options.forEach((option, index) => {
          if (typeof option !== 'string' || option.trim().length === 0) {
            throw new Error(`Option ${index + 1} cannot be empty`);
          }
          if (option.trim().length > 100) {
            throw new Error(`Option ${index + 1} must be less than 100 characters`);
          }
        });
        
        // Check for duplicate options
        const uniqueOptions = [...new Set(options.map(opt => opt.trim().toLowerCase()))];
        if (uniqueOptions.length !== options.length) {
          throw new Error('Duplicate options are not allowed');
        }
      }
      return true;
    }),
  
  body('isRequired')
    .optional()
    .isBoolean()
    .withMessage('isRequired must be a boolean'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  
  body('validation')
    .optional()
    .isObject()
    .withMessage('Validation must be an object'),
  
  body('validation.minLength')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('minLength must be a positive integer between 1 and 1000'),
  
  body('validation.maxLength')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('maxLength must be a positive integer between 1 and 1000'),
  
  body('validation.minValue')
    .optional()
    .isNumeric()
    .withMessage('minValue must be a number'),
  
  body('validation.maxValue')
    .optional()
    .isNumeric()
    .withMessage('maxValue must be a number'),
  
  body('validation.pattern')
    .optional()
    .isString()
    .withMessage('pattern must be a string')
]; 

// Validation rules for order creation (simplified - customer details from token)
exports.createOrderValidation = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),
  
  body('items.*.product')
    .notEmpty()
    .withMessage('Product ID is required for each item')
    .isMongoId()
    .withMessage('Product ID must be a valid MongoDB ObjectId'),
  
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
  
  body('items.*.unitPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Unit price must be a positive number'),
  
  body('items.*.discount')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Discount must be between 0 and 100'),
  
  body('items.*.taxRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Tax rate must be a positive number'),
  
  // Shipping address is optional - will use user's default address if not provided
  body('shippingAddress')
    .optional()
    .isObject()
    .withMessage('Shipping address must be an object'),
  
  body('shippingAddress.firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  
  body('shippingAddress.lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  
  body('shippingAddress.addressLine1')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Address line 1 must be between 1 and 100 characters'),
  
  body('shippingAddress.city')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('City must be between 1 and 50 characters'),
  
  body('shippingAddress.state')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('State must be between 1 and 50 characters'),
  
  body('shippingAddress.country')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Country must be between 1 and 50 characters'),
  
  body('shippingAddress.postalCode')
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Postal code must be between 1 and 20 characters'),
  
  // Payment info is optional - will default to invoice
  body('paymentInfo')
    .optional()
    .isObject()
    .withMessage('Payment information must be an object'),
  
  body('paymentInfo.paymentMethod')
    .optional()
    .isIn(['credit_card', 'bank_transfer', 'paypal', 'invoice', 'cash_on_delivery'])
    .withMessage('Payment method must be one of: credit_card, bank_transfer, paypal, invoice, cash_on_delivery'),
  
  body('shippingMethod')
    .optional()
    .isIn(['standard', 'express', 'overnight', 'pickup'])
    .withMessage('Shipping method must be one of: standard, express, overnight, pickup'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be one of: low, medium, high, urgent'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
  
  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code')
    .isUppercase()
    .withMessage('Currency must be uppercase')
];

// Validation rules for order update
exports.updateOrderValidation = [
  body('shippingAddress')
    .optional()
    .isObject()
    .withMessage('Shipping address must be an object'),
  
  body('shippingAddress.firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  
  body('shippingAddress.lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  
  body('shippingAddress.addressLine1')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Address line 1 must be between 1 and 100 characters'),
  
  body('shippingAddress.city')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('City must be between 1 and 50 characters'),
  
  body('shippingAddress.state')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('State must be between 1 and 50 characters'),
  
  body('shippingAddress.country')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Country must be between 1 and 50 characters'),
  
  body('shippingAddress.postalCode')
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Postal code must be between 1 and 20 characters'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
  
  body('internalNotes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Internal notes cannot exceed 1000 characters'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be one of: low, medium, high, urgent'),
  
  body('shippingMethod')
    .optional()
    .isIn(['standard', 'express', 'overnight', 'pickup'])
    .withMessage('Shipping method must be one of: standard, express, overnight, pickup'),
  
  body('estimatedDeliveryDate')
    .optional()
    .isISO8601()
    .withMessage('Estimated delivery date must be a valid date'),
  
  body('trackingNumber')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Tracking number cannot exceed 100 characters')
];

// Validation rules for order status update
exports.updateOrderStatusValidation = [
  body('status')
    .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'])
    .withMessage('Status must be one of: pending, confirmed, processing, shipped, delivered, cancelled, returned'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

// Validation rules for order cancellation
exports.cancelOrderValidation = [
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Cancellation reason cannot exceed 500 characters')
];

// Validation for MongoDB ObjectId parameters
exports.validateObjectId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format')
];

// Validation for category ID parameter
exports.validateCategoryId = [
  param('categoryId')
    .isMongoId()
    .withMessage('Invalid category ID format')
];

// Validation for brand ID parameter
exports.validateBrandId = [
  param('brandId')
    .isMongoId()
    .withMessage('Invalid brand ID format')
];

// Middleware to check for validation errors
exports.validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// Promo Code validation rules

// Validation rules for promo code creation
exports.createPromoCodeValidation = [
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Promo code is required')
    .isLength({ min: 3, max: 20 })
    .withMessage('Promo code must be between 3 and 20 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Promo code can only contain uppercase letters and numbers')
    .customSanitizer(value => value.toUpperCase()),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  body('discountType')
    .isIn(['percentage', 'fixed'])
    .withMessage('Discount type must be either percentage or fixed'),
  
  body('discountValue')
    .isFloat({ min: 0.01 })
    .withMessage('Discount value must be greater than 0')
    .custom((value, { req }) => {
      if (req.body.discountType === 'percentage' && value > 100) {
        throw new Error('Percentage discount cannot exceed 100');
      }
      return true;
    }),
  
  body('minimumOrderValue')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum order value cannot be negative'),
  
  body('usageLimit')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Usage limit must be at least 1'),
  
  body('usagePerCustomer')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Usage per customer must be at least 1')
    .custom((value, { req }) => {
      if (value && req.body.usageLimit && value > req.body.usageLimit) {
        throw new Error('Usage per customer cannot exceed total usage limit');
      }
      return true;
    }),
  
  body('startDate')
    .isISO8601()
    .withMessage('Start date must be a valid date')
    .toDate(),
  
  body('endDate')
    .isISO8601()
    .withMessage('End date must be a valid date')
    .toDate()
    .custom((value, { req }) => {
      if (value <= req.body.startDate) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),
  
  body('applicableProducts')
    .optional()
    .isArray()
    .withMessage('Applicable products must be an array')
    .custom((products, { req }) => {
      if (req.body.allProducts && products.length > 0) {
        throw new Error('Cannot have both allProducts true and specific applicable products');
      }
      if (!req.body.allProducts && products.length === 0) {
        throw new Error('Must either apply to all products or specify applicable products');
      }
      return true;
    }),
  
  body('applicableProducts.*')
    .optional()
    .isMongoId()
    .withMessage('Each applicable product must be a valid product ID'),
  
  body('allProducts')
    .optional()
    .isBoolean()
    .withMessage('allProducts must be a boolean value')
];

// Validation rules for promo code update
exports.updatePromoCodeValidation = [
  body('code')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Promo code cannot be empty')
    .isLength({ min: 3, max: 20 })
    .withMessage('Promo code must be between 3 and 20 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Promo code can only contain uppercase letters and numbers')
    .customSanitizer(value => value.toUpperCase()),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  body('discountType')
    .optional()
    .isIn(['percentage', 'fixed'])
    .withMessage('Discount type must be either percentage or fixed'),
  
  body('discountValue')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Discount value must be greater than 0')
    .custom((value, { req }) => {
      if (req.body.discountType === 'percentage' && value > 100) {
        throw new Error('Percentage discount cannot exceed 100');
      }
      return true;
    }),
  
  body('minimumOrderValue')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum order value cannot be negative'),
  
  body('usageLimit')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Usage limit must be at least 1'),
  
  body('usagePerCustomer')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Usage per customer must be at least 1')
    .custom((value, { req }) => {
      if (value && req.body.usageLimit && value > req.body.usageLimit) {
        throw new Error('Usage per customer cannot exceed total usage limit');
      }
      return true;
    }),
  
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date')
    .toDate(),
  
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date')
    .toDate()
    .custom((value, { req }) => {
      if (value && req.body.startDate && value <= req.body.startDate) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),
  
  body('applicableProducts')
    .optional()
    .isArray()
    .withMessage('Applicable products must be an array')
    .custom((products, { req }) => {
      if (req.body.allProducts && products.length > 0) {
        throw new Error('Cannot have both allProducts true and specific applicable products');
      }
      if (req.body.allProducts === false && products.length === 0) {
        throw new Error('Must either apply to all products or specify applicable products');
      }
      return true;
    }),
  
  body('applicableProducts.*')
    .optional()
    .isMongoId()
    .withMessage('Each applicable product must be a valid product ID'),
  
  body('allProducts')
    .optional()
    .isBoolean()
    .withMessage('allProducts must be a boolean value')
];

// Validation rules for promo code validation
exports.validatePromoCodeValidation = [
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Promo code is required')
    .customSanitizer(value => value.toUpperCase()),
  
  body('customerId')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Customer ID cannot be empty'),
  
  body('orderValue')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Order value must be a positive number'),
  
  body('productIds')
    .optional()
    .isArray()
    .withMessage('Product IDs must be an array'),
  
  body('productIds.*')
    .optional()
    .isMongoId()
    .withMessage('Each product ID must be a valid MongoDB ObjectId')
];

// Validation rules for promo code application
exports.applyPromoCodeValidation = [
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Promo code is required')
    .customSanitizer(value => value.toUpperCase()),
  
  body('customerId')
    .trim()
    .notEmpty()
    .withMessage('Customer ID is required'),
  
  body('orderId')
    .trim()
    .notEmpty()
    .withMessage('Order ID is required'),
  
  body('orderValue')
    .isFloat({ min: 0.01 })
    .withMessage('Order value must be greater than 0'),
  
  body('productIds')
    .optional()
    .isArray()
    .withMessage('Product IDs must be an array'),
  
  body('productIds.*')
    .optional()
    .isMongoId()
    .withMessage('Each product ID must be a valid MongoDB ObjectId')
];

// Validation rules for promo code duplication
exports.duplicatePromoCodeValidation = [
  body('newCode')
    .trim()
    .notEmpty()
    .withMessage('New promo code is required')
    .isLength({ min: 3, max: 20 })
    .withMessage('New promo code must be between 3 and 20 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('New promo code can only contain uppercase letters and numbers')
    .customSanitizer(value => value.toUpperCase()),
  
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date')
    .toDate(),
  
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date')
    .toDate()
    .custom((value, { req }) => {
      if (value && req.body.startDate && value <= req.body.startDate) {
        throw new Error('End date must be after start date');
      }
      return true;
    })
];

// Validation rules for promo code generation
exports.generatePromoCodeValidation = [
  body('prefix')
    .optional()
    .trim()
    .isLength({ min: 1, max: 10 })
    .withMessage('Prefix must be between 1 and 10 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Prefix can only contain uppercase letters and numbers')
    .customSanitizer(value => value.toUpperCase()),
  
  body('length')
    .optional()
    .isInt({ min: 4, max: 20 })
    .withMessage('Code length must be between 4 and 20 characters')
    .custom((value, { req }) => {
      if (req.body.prefix && req.body.prefix.length >= value) {
        throw new Error('Prefix length must be less than total code length');
      }
      return true;
    })
];

// Validation parameter check
exports.validatePromoCodeId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid promo code ID format')
];

// Product validation rules

// Validation rules for product creation
exports.createProductValidation = [
  // Basic Information
  body('productName')
    .trim()
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('Product name must be between 2 and 200 characters'),
  
  body('seller')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Seller name cannot exceed 100 characters'),
  
  body('sku')
    .trim()
    .notEmpty()
    .withMessage('SKU is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('SKU must be between 2 and 50 characters')
    .matches(/^[A-Z0-9\-_]+$/)
    .withMessage('SKU can only contain uppercase letters, numbers, hyphens, and underscores')
    .customSanitizer(value => value.toUpperCase()),
  
  // Category and Brand (Required as per design)
  body('categories')
    .custom((value) => {
      // Handle different input formats
      if (typeof value === 'string') {
        try {
          // Try to parse as JSON
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return true;
          }
        } catch (e) {
          // If not JSON, check if it's comma-separated
          const items = value.split(',').map(item => item.trim()).filter(item => item);
          if (items.length > 0) {
            return true;
          }
        }
        throw new Error('Categories must be a valid array or comma-separated string');
      } else if (Array.isArray(value)) {
        if (value.length > 0) {
          return true;
        }
        throw new Error('At least one category is required');
      }
      throw new Error('Categories field is required');
    })
    .customSanitizer((value) => {
      // Convert different formats to array
      if (typeof value === 'string') {
        try {
          // Try to parse as JSON first
          return JSON.parse(value);
        } catch (e) {
          // If not JSON, treat as comma-separated
          return value.split(',').map(item => item.trim()).filter(item => item);
        }
      }
      return value;
    }),
  
  body('categories.*')
    .trim()
    .isMongoId()
    .withMessage('Each category must be a valid MongoDB ObjectId'),
  
  body('brandId')
    .notEmpty()
    .withMessage('Brand is required')
    .isMongoId()
    .withMessage('Brand must be a valid MongoDB ObjectId'),
  
  // Pricing
  body('price')
    .isFloat({ min: 0.01 })
    .withMessage('Price must be greater than 0'),
  
  body('comparePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Compare price must be a positive number')
    .custom((value, { req }) => {
      if (value && req.body.price && parseFloat(value) <= parseFloat(req.body.price)) {
        throw new Error('Compare price must be greater than regular price');
      }
      return true;
    }),
  
  body('costPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Cost price must be a positive number'),
  
  // Inventory
  body('stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),
  
  body('stockStatus')
    .optional()
    .isIn(['in_stock', 'out_of_stock', 'low_stock', 'pre_order'])
    .withMessage('Stock status must be one of: in_stock, out_of_stock, low_stock, pre_order'),
  
  body('lowStockThreshold')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Low stock threshold must be a non-negative integer'),
  
  body('trackQuantity')
    .optional()
    .isBoolean()
    .withMessage('Track quantity must be a boolean'),
  
  // Tax and Policies
  body('taxRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Tax rate must be between 0 and 100'),
  
  body('guaranteePeriod')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Guarantee period cannot exceed 100 characters'),
  
  body('isReturnable')
    .optional()
    .isBoolean()
    .withMessage('Returnable must be a boolean'),
  
  body('isCancelable')
    .optional()
    .isBoolean()
    .withMessage('Cancelable must be a boolean'),
  
  // Descriptions
  body('shortDescription')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Short description cannot exceed 500 characters'),
  
  body('longDescription')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Long description cannot exceed 5000 characters'),
  
  // Product Status
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'draft', 'archived'])
    .withMessage('Status must be one of: active, inactive, draft, archived'),
  
  body('isPublished')
    .optional()
    .isBoolean()
    .withMessage('Published status must be a boolean'),
  
  // Weight and Dimensions
  body('weight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Weight must be a positive number'),
  
  body('dimensions.length')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Length must be a positive number'),
  
  body('dimensions.width')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Width must be a positive number'),
  
  body('dimensions.height')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Height must be a positive number'),
  
  // Complex Fields Validation
  body('attributes')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          JSON.parse(value);
        } catch (e) {
          throw new Error('Attributes must be valid JSON');
        }
      } else if (value && !Array.isArray(value)) {
        throw new Error('Attributes must be an array or valid JSON string');
      }
      return true;
    }),
  
  body('quantityLevels')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          JSON.parse(value);
        } catch (e) {
          throw new Error('Quantity levels must be valid JSON');
        }
      } else if (value && !Array.isArray(value)) {
        throw new Error('Quantity levels must be an array or valid JSON string');
      }
      return true;
    }),
  
  body('parcel')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          JSON.parse(value);
        } catch (e) {
          throw new Error('Parcel information must be valid JSON');
        }
      } else if (value && typeof value !== 'object') {
        throw new Error('Parcel information must be an object or valid JSON string');
      }
      return true;
    }),
  
  body('additionalFields')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          JSON.parse(value);
        } catch (e) {
          throw new Error('Additional fields must be valid JSON');
        }
      } else if (value && !Array.isArray(value)) {
        throw new Error('Additional fields must be an array or valid JSON string');
      }
      return true;
    }),
  
  body('meta')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          JSON.parse(value);
        } catch (e) {
          throw new Error('Meta information must be valid JSON');
        }
      } else if (value && typeof value !== 'object') {
        throw new Error('Meta information must be an object or valid JSON string');
      }
      return true;
    })
];

// Validation rules for product update
exports.updateProductValidation = [
  // Basic Information
  body('productName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Product name cannot be empty')
    .isLength({ min: 2, max: 200 })
    .withMessage('Product name must be between 2 and 200 characters'),
  
  body('seller')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Seller name cannot exceed 100 characters'),
  
  body('sku')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('SKU cannot be empty')
    .isLength({ min: 2, max: 50 })
    .withMessage('SKU must be between 2 and 50 characters')
    .matches(/^[A-Z0-9\-_]+$/)
    .withMessage('SKU can only contain uppercase letters, numbers, hyphens, and underscores')
    .customSanitizer(value => value.toUpperCase()),
  
  // Category and Brand
  body('categories')
    .optional()
    .custom((value) => {
      if (value === undefined || value === null) return true; // Optional field
      
      // Handle different input formats
      if (typeof value === 'string') {
        try {
          // Try to parse as JSON
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return true;
          }
        } catch (e) {
          // If not JSON, check if it's comma-separated
          const items = value.split(',').map(item => item.trim()).filter(item => item);
          if (items.length > 0) {
            return true;
          }
        }
        throw new Error('Categories must be a valid array or comma-separated string');
      } else if (Array.isArray(value)) {
        if (value.length > 0) {
          return true;
        }
        throw new Error('At least one category is required when updating categories');
      }
      throw new Error('Invalid categories format');
    })
    .customSanitizer((value) => {
      if (value === undefined || value === null) return value;
      
      // Convert different formats to array
      if (typeof value === 'string') {
        try {
          // Try to parse as JSON first
          return JSON.parse(value);
        } catch (e) {
          // If not JSON, treat as comma-separated
          return value.split(',').map(item => item.trim()).filter(item => item);
        }
      }
      return value;
    }),
  
  body('categories.*')
    .optional()
    .trim()
    .isMongoId()
    .withMessage('Each category must be a valid MongoDB ObjectId'),
  
  body('brandId')
    .optional()
    .isMongoId()
    .withMessage('Brand must be a valid MongoDB ObjectId'),
  
  // Pricing
  body('price')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Price must be greater than 0'),
  
  body('comparePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Compare price must be a positive number')
    .custom((value, { req }) => {
      if (value && req.body.price && parseFloat(value) <= parseFloat(req.body.price)) {
        throw new Error('Compare price must be greater than regular price');
      }
      return true;
    }),
  
  body('costPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Cost price must be a positive number'),
  
  // Inventory
  body('stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),
  
  body('stockStatus')
    .optional()
    .isIn(['in_stock', 'out_of_stock', 'low_stock', 'pre_order'])
    .withMessage('Stock status must be one of: in_stock, out_of_stock, low_stock, pre_order'),
  
  body('lowStockThreshold')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Low stock threshold must be a non-negative integer'),
  
  body('trackQuantity')
    .optional()
    .isBoolean()
    .withMessage('Track quantity must be a boolean'),
  
  // Tax and Policies
  body('taxRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Tax rate must be between 0 and 100'),
  
  body('guaranteePeriod')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Guarantee period cannot exceed 100 characters'),
  
  body('isReturnable')
    .optional()
    .isBoolean()
    .withMessage('Returnable must be a boolean'),
  
  body('isCancelable')
    .optional()
    .isBoolean()
    .withMessage('Cancelable must be a boolean'),
  
  // Descriptions
  body('shortDescription')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Short description cannot exceed 500 characters'),
  
  body('longDescription')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Long description cannot exceed 5000 characters'),
  
  // Product Status
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'draft', 'archived'])
    .withMessage('Status must be one of: active, inactive, draft, archived'),
  
  body('isPublished')
    .optional()
    .isBoolean()
    .withMessage('Published status must be a boolean'),
  
  // Weight and Dimensions
  body('weight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Weight must be a positive number'),
  
  body('dimensions.length')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Length must be a positive number'),
  
  body('dimensions.width')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Width must be a positive number'),
  
  body('dimensions.height')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Height must be a positive number'),
  
  // Complex Fields Validation
  body('attributes')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          JSON.parse(value);
        } catch (e) {
          throw new Error('Attributes must be valid JSON');
        }
      } else if (value && !Array.isArray(value)) {
        throw new Error('Attributes must be an array or valid JSON string');
      }
      return true;
    }),
  
  body('quantityLevels')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          JSON.parse(value);
        } catch (e) {
          throw new Error('Quantity levels must be valid JSON');
        }
      } else if (value && !Array.isArray(value)) {
        throw new Error('Quantity levels must be an array or valid JSON string');
      }
      return true;
    }),
  
  body('parcel')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          JSON.parse(value);
        } catch (e) {
          throw new Error('Parcel information must be valid JSON');
        }
      } else if (value && typeof value !== 'object') {
        throw new Error('Parcel information must be an object or valid JSON string');
      }
      return true;
    }),
  
  body('additionalFields')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          JSON.parse(value);
        } catch (e) {
          throw new Error('Additional fields must be valid JSON');
        }
      } else if (value && !Array.isArray(value)) {
        throw new Error('Additional fields must be an array or valid JSON string');
      }
      return true;
    }),
  
  body('meta')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          JSON.parse(value);
        } catch (e) {
          throw new Error('Meta information must be valid JSON');
        }
      } else if (value && typeof value !== 'object') {
        throw new Error('Meta information must be an object or valid JSON string');
      }
      return true;
    })
];

// Transaction validation rules

// Validation rules for transaction creation
exports.createTransactionValidation = [
  body('orderId')
    .trim()
    .notEmpty()
    .withMessage('Order ID is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Order ID must be between 1 and 50 characters'),
  
  body('customer')
    .isObject()
    .withMessage('Customer information is required'),
  
  body('customer.id')
    .trim()
    .notEmpty()
    .withMessage('Customer ID is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Customer ID must be between 1 and 50 characters'),
  
  body('customer.name')
    .trim()
    .notEmpty()
    .withMessage('Customer name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Customer name must be between 1 and 100 characters'),
  
  body('customer.email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  
  body('paymentMethod')
    .optional()
    .isIn(['Credit Card', 'Debit Card', 'Bank Transfer', 'PayPal', 'Cash', 'Check', 'Wire Transfer'])
    .withMessage('Payment method must be one of: Credit Card, Debit Card, Bank Transfer, PayPal, Cash, Check, Wire Transfer'),
  
  body('status')
    .optional()
    .isIn(['Pending', 'Completed', 'Failed', 'Cancelled', 'Refunded', 'Partially Refunded'])
    .withMessage('Status must be one of: Pending, Completed, Failed, Cancelled, Refunded, Partially Refunded'),
  
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be between 1 and 500 characters'),
  
  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code')
    .isUppercase()
    .withMessage('Currency must be uppercase'),
  
  body('fees')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Fees must be a positive number'),
  
  body('reference')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Reference cannot exceed 100 characters'),
  
  body('invoice')
    .isObject()
    .withMessage('Invoice information is required'),
  
  body('invoice.invoiceNumber')
    .trim()
    .notEmpty()
    .withMessage('Invoice number is required'),
  
  body('invoice.invoiceDate')
    .isISO8601()
    .withMessage('Invoice date must be a valid date')
    .toDate(),
  
  body('invoice.dueDate')
    .isISO8601()
    .withMessage('Due date must be a valid date')
    .toDate()
    .custom((value, { req }) => {
      if (value <= req.body.invoice.invoiceDate) {
        throw new Error('Due date must be after invoice date');
      }
      return true;
    }),
  
  body('invoice.status')
    .optional()
    .isIn(['Pending', 'Paid', 'Overdue', 'Cancelled'])
    .withMessage('Invoice status must be one of: Pending, Paid, Overdue, Cancelled'),
  
  body('invoice.totalAmount')
    .isFloat({ min: 0.01 })
    .withMessage('Invoice total amount must be greater than 0'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
];

// Validation rules for transaction update
exports.updateTransactionValidation = [
  body('orderId')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Order ID cannot be empty')
    .isLength({ min: 1, max: 50 })
    .withMessage('Order ID must be between 1 and 50 characters'),
  
  body('customer')
    .optional()
    .isObject()
    .withMessage('Customer information must be an object'),
  
  body('customer.id')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Customer ID cannot be empty')
    .isLength({ min: 1, max: 50 })
    .withMessage('Customer ID must be between 1 and 50 characters'),
  
  body('customer.name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Customer name cannot be empty')
    .isLength({ min: 1, max: 100 })
    .withMessage('Customer name must be between 1 and 100 characters'),
  
  body('customer.email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  
  body('paymentMethod')
    .optional()
    .isIn(['Credit Card', 'Debit Card', 'Bank Transfer', 'PayPal', 'Cash', 'Check', 'Wire Transfer'])
    .withMessage('Payment method must be one of: Credit Card, Debit Card, Bank Transfer, PayPal, Cash, Check, Wire Transfer'),
  
  body('status')
    .optional()
    .isIn(['Pending', 'Completed', 'Failed', 'Cancelled', 'Refunded', 'Partially Refunded'])
    .withMessage('Status must be one of: Pending, Completed, Failed, Cancelled, Refunded, Partially Refunded'),
  
  body('description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Description cannot be empty')
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be between 1 and 500 characters'),
  
  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code')
    .isUppercase()
    .withMessage('Currency must be uppercase'),
  
  body('fees')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Fees must be a positive number'),
  
  body('reference')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Reference cannot exceed 100 characters'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
];

// Validation rules for marking transaction as completed
exports.markTransactionCompletedValidation = [
  body('gatewayTransactionId')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Gateway transaction ID cannot exceed 100 characters'),
  
  body('gatewayResponse')
    .optional()
    .isObject()
    .withMessage('Gateway response must be an object')
];

// Validation rules for marking transaction as failed
exports.markTransactionFailedValidation = [
  body('gatewayResponse')
    .optional()
    .isObject()
    .withMessage('Gateway response must be an object')
];

// Validation rules for processing refund
exports.processRefundValidation = [
  body('refundAmount')
    .isFloat({ min: 0.01 })
    .withMessage('Refund amount must be greater than 0'),
  
  body('refundReason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Refund reason cannot exceed 500 characters')
];

// Validation rules for address creation
exports.createAddressValidation = [
  // Optional customerId: only honored for admins (controller enforces)
  body('customerId')
    .optional()
    .isMongoId()
    .withMessage('customerId must be a valid MongoDB ObjectId'),
  body('addressType')
    .optional()
    .isIn(['home', 'work', 'billing', 'shipping', 'other'])
    .withMessage('Address type must be one of: home, work, billing, shipping, other'),
  
  body('isDefault')
    .optional()
    .isBoolean()
    .withMessage('isDefault must be a boolean value'),
  
  body('label')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Label cannot exceed 50 characters'),
  
  body('contactName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Contact name cannot exceed 100 characters'),
  
  body('contactPhone')
    .optional()
    .trim()
    .matches(/^\+?[1-9]\d{7,14}$/)
    .withMessage('Please enter a valid phone number in international format'),
  
  // Support either `street` or external `line1`
  body(['street', 'line1'])
    .custom((value, { req }) => {
      const v = req.body.street ?? req.body.line1;
      if (!v || String(v).trim().length === 0) {
        throw new Error('Street (line1) is required');
      }
      if (String(v).length > 200) {
        throw new Error('Street address cannot exceed 200 characters');
      }
      return true;
    }),
  
  // Support optional `street2` or external `line2`
  body(['street2', 'line2'])
    .optional()
    .custom((value, { req }) => {
      const v = req.body.street2 ?? req.body.line2;
      if (v && String(v).length > 200) {
        throw new Error('Street address 2 cannot exceed 200 characters');
      }
      return true;
    }),
  
  body('city')
    .trim()
    .notEmpty()
    .withMessage('City is required')
    .isLength({ max: 100 })
    .withMessage('City name cannot exceed 100 characters'),
  
  body('state')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('State name cannot exceed 100 characters'),
  
  body('postalCode')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Postal code cannot exceed 20 characters'),
  
  body('country')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country name cannot exceed 100 characters'),
  
  body('coordinates.latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  body('coordinates.longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  
  body('instructions')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Delivery instructions cannot exceed 500 characters')
];

// Validation rules for address update
exports.updateAddressValidation = [
  body('customerId')
    .optional()
    .isMongoId()
    .withMessage('customerId must be a valid MongoDB ObjectId'),
  body('addressType')
    .optional()
    .isIn(['home', 'work', 'billing', 'shipping', 'other'])
    .withMessage('Address type must be one of: home, work, billing, shipping, other'),
  
  body('isDefault')
    .optional()
    .isBoolean()
    .withMessage('isDefault must be a boolean value'),
  
  body('label')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Label cannot exceed 50 characters'),
  
  body('contactName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Contact name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Contact name cannot exceed 100 characters'),
  
  body('contactPhone')
    .optional()
    .trim()
    .matches(/^\+?[1-9]\d{7,14}$/)
    .withMessage('Please enter a valid phone number in international format'),
  
  body('street')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Street address cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Street address cannot exceed 200 characters'),
  
  body('street2')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Street address 2 cannot exceed 200 characters'),
  
  body('city')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('City cannot be empty')
    .isLength({ max: 100 })
    .withMessage('City name cannot exceed 100 characters'),
  
  body('state')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('State cannot be empty')
    .isLength({ max: 100 })
    .withMessage('State name cannot exceed 100 characters'),
  
  body('postalCode')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Postal code cannot be empty')
    .isLength({ max: 20 })
    .withMessage('Postal code cannot exceed 20 characters'),
  
  body('country')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Country cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Country name cannot exceed 100 characters'),
  
  body('coordinates.latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  body('coordinates.longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  
  body('instructions')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Delivery instructions cannot exceed 500 characters')
];

// Validation rules for address ID
exports.validateAddressId = [
  param('addressId')
    .isMongoId()
    .withMessage('Invalid address ID format')
];

// Handle validation errors middleware
exports.handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const details = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));

    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Input validation failed',
        details
      }
    });
  }
  
  next();
}; 