const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect, restrictTo, adminOnly, customerOnly } = require('../middleware/auth');
const {
  createOrderValidation,
  updateOrderValidation,
  updateOrderStatusValidation,
  cancelOrderValidation,
  validateObjectId,
  validateRequest
} = require('../middleware/validation');

// Public routes - none for orders (all require authentication)

// User routes (authenticated users)
router.use(protect); // All routes below require authentication

// Get user's own orders
router.get('/my-orders', orderController.getMyOrders);

// Create a new order
router.post('/', 
  createOrderValidation,
  validateRequest,
  orderController.createOrder
);

// Get single order by ID (user can only access their own orders, admin can access all)
router.get('/:id',
  validateObjectId,
  validateRequest,
  orderController.getOrderById
);

// Update order (users can update limited fields, admin can update more)
router.put('/:id',
  validateObjectId,
  updateOrderValidation,
  validateRequest,
  orderController.updateOrder
);

// Cancel order (users can cancel their own orders, admin can cancel any)
router.patch('/:id/cancel',
  validateObjectId,
  cancelOrderValidation,
  validateRequest,
  orderController.cancelOrder
);

// Admin-only routes
router.use(adminOnly); // All routes below require admin role with enhanced validation

// Get all orders (admin only)
router.get('/', orderController.getOrders);

// Update order status (admin only)
router.patch('/:id/status',
  validateObjectId,
  updateOrderStatusValidation,
  validateRequest,
  orderController.updateOrderStatus
);

// Get order statistics (admin only)
router.get('/admin/stats', orderController.getOrderStats);

// Delete order (admin only - soft delete)
router.delete('/:id',
  validateObjectId,
  validateRequest,
  orderController.deleteOrder
);

module.exports = router;