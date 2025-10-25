const { validationResult } = require('express-validator');
const UserService = require('../services/UserService');
const AuthService = require('../services/AuthService');
const ResponseService = require('../services/ResponseService');
const { 
  ValidationError, 
  NotFoundError,
  asyncHandler 
} = require('../middleware/errorHandler');

// @desc    Create a new customer
// @route   POST /api/customers
// @access  Private (Admin only)
exports.createCustomer = asyncHandler(async (req, res, next) => {
  // Create customer with role 'user'
  const customerData = {
    ...req.body,
    role: 'user'
  };

  const customer = await AuthService.registerUser(customerData);
  
  // Remove password from response
  const customerResponse = {
    _id: customer._id,
    username: customer.username,
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
    phoneNumber: customer.phoneNumber,
    role: customer.role,
    isActive: customer.isActive,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt
  };

  return ResponseService.success(res, 201, 'Customer created successfully', { customer: customerResponse });
});

// @desc    Get all customers (users with role 'user')
// @route   GET /api/customers
// @access  Private (Admin only)
exports.getCustomers = asyncHandler(async (req, res, next) => {
  // Add role filter to only get customers (users with role 'user')
  const options = {
    ...req.query,
    role: 'user'
  };
  
  const result = await UserService.getAllUsers(options);
  return ResponseService.paginated(res, result.users, result.pagination, 'Customers retrieved successfully');
});

// @desc    Get customer by ID

// @route   GET /api/customers/:id
// @access  Private (Admin only)
exports.getCustomerById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  
  if (!id) {
    throw new ValidationError('Customer ID is required');
  }

  // Check if ID is a valid MongoDB ObjectId format
  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    throw new ValidationError('Invalid customer ID format. Please provide a valid customer ID.');
  }

  const customer = await UserService.getUserById(id);
  
  // Verify this is actually a customer (role 'user')
  if (customer.role !== 'user') {
    throw new NotFoundError('Customer');
  }
  
  return ResponseService.success(res, 200, 'Customer details retrieved successfully', { customer });
});

// @desc    Update customer profile (Admin only)
// @route   PUT /api/customers/:id
// @access  Private (Admin only)
exports.updateCustomer = asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { id } = req.params;
  
  if (!id) {
    throw new ValidationError('Customer ID is required');
  }

  // Check if ID is a valid MongoDB ObjectId format
  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    throw new ValidationError('Invalid customer ID format. Please provide a valid customer ID.');
  }

  // First verify this is a customer
  const existingCustomer = await UserService.getUserById(id);
  if (existingCustomer.role !== 'user') {
    throw new NotFoundError('Customer');
  }

  const updatedCustomer = await UserService.updateProfile(id, req.body);
  return ResponseService.success(res, 200, 'Customer updated successfully', { customer: updatedCustomer });
});

// @desc    Deactivate customer account
// @route   PATCH /api/customers/:id/deactivate
// @access  Private (Admin only)
exports.deactivateCustomer = asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { id } = req.params;
  const { reason } = req.body;
  
  if (!id) {
    throw new ValidationError('Customer ID is required');
  }

  // Check if ID is a valid MongoDB ObjectId format
  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    throw new ValidationError('Invalid customer ID format. Please provide a valid customer ID.');
  }

  // First verify this is a customer
  const existingCustomer = await UserService.getUserById(id);
  if (existingCustomer.role !== 'user') {
    throw new NotFoundError('Customer');
  }

  const result = await UserService.deactivateAccount(id);
  return ResponseService.success(res, 200, 'Customer account deactivated successfully', result);
});

// @desc    Reactivate customer account
// @route   PATCH /api/customers/:id/reactivate
// @access  Private (Admin only)
exports.reactivateCustomer = asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }

  const { id } = req.params;
  const { reason } = req.body;
  
  if (!id) {
    throw new ValidationError('Customer ID is required');
  }

  // Check if ID is a valid MongoDB ObjectId format
  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    throw new ValidationError('Invalid customer ID format. Please provide a valid customer ID.');
  }

  // First verify this is a customer
  const existingCustomer = await UserService.getUserById(id);
  if (existingCustomer.role !== 'user') {
    throw new NotFoundError('Customer');
  }

  const result = await UserService.reactivateAccount(id, req.user.id, reason);
  return ResponseService.success(res, 200, 'Customer account reactivated successfully', result);
});

// @desc    Get customer statistics
// @route   GET /api/customers/stats
// @access  Private (Admin only)
exports.getCustomerStats = asyncHandler(async (req, res, next) => {
  const stats = await UserService.getUserStats();
  
  // Filter to only show customer-related stats
  const customerStats = {
    totalCustomers: stats.regularUsers,
    activeCustomers: stats.activeUsers - stats.adminUsers, // Subtract admin users from active users
    inactiveCustomers: stats.inactiveUsers,
    recentRegistrations: stats.recentRegistrations,
    recentDeactivations: stats.recentDeactivations,
    lastUpdated: stats.lastUpdated
  };
  
  return ResponseService.success(res, 200, 'Customer statistics retrieved successfully', customerStats);
});

// @desc    Search customers
// @route   GET /api/customers/search
// @access  Private (Admin only)
exports.searchCustomers = asyncHandler(async (req, res, next) => {
  const { q: searchTerm } = req.query;
  
  if (!searchTerm || searchTerm.trim().length < 2) {
    throw new ValidationError('Search term must be at least 2 characters long');
  }

  const options = {
    ...req.query,
    search: searchTerm.trim(),
    role: 'user'
  };
  
  const result = await UserService.getAllUsers(options);
  return ResponseService.paginated(res, result.users, result.pagination, 'Customer search results');
});
