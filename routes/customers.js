const express = require('express');
const router = express.Router();
const customersController = require('../controllers/customersController');
const { protect, adminOnly } = require('../middleware/auth');
const {
  createCustomerValidation,
  updateProfileValidation,
  validateObjectId,
  validateRequest
} = require('../middleware/validation');

// All customer routes require authentication
router.use(protect);

// All customer routes require admin role
router.use(adminOnly);

// @route   POST /api/customers
// @desc    Create a new customer
// @access  Private (Admin only)
router.post('/',
  createCustomerValidation,
  validateRequest,
  customersController.createCustomer
);

// @route   GET /api/customers
// @desc    Get all customers with pagination and filtering
// @access  Private (Admin only)
router.get('/', customersController.getCustomers);

// @route   GET /api/customers/stats
// @desc    Get customer statistics
// @access  Private (Admin only)
router.get('/stats', customersController.getCustomerStats);

// @route   GET /api/customers/search
// @desc    Search customers by name, email, username, or phone
// @access  Private (Admin only)
router.get('/search', customersController.searchCustomers);

// @route   GET /api/customers/:id
// @desc    Get customer by ID
// @access  Private (Admin only)
router.get('/:id',
  validateObjectId,
  validateRequest,
  customersController.getCustomerById
);

// @route   PUT /api/customers/:id
// @desc    Update customer profile
// @access  Private (Admin only)
router.put('/:id',
  validateObjectId,
  updateProfileValidation,
  validateRequest,
  customersController.updateCustomer
);

// @route   PATCH /api/customers/:id/deactivate
// @desc    Deactivate customer account
// @access  Private (Admin only)
router.patch('/:id/deactivate',
  validateObjectId,
  validateRequest,
  customersController.deactivateCustomer
);

// @route   PATCH /api/customers/:id/reactivate
// @desc    Reactivate customer account
// @access  Private (Admin only)
router.patch('/:id/reactivate',
  validateObjectId,
  validateRequest,
  customersController.reactivateCustomer
);

module.exports = router;
