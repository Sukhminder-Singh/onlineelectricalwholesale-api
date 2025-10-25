const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { protect, restrictTo, adminOnly, customerOnly } = require('../middleware/auth');
const {
  createTransactionValidation,
  updateTransactionValidation,
  markTransactionCompletedValidation,
  markTransactionFailedValidation,
  processRefundValidation,
  validateObjectId,
  validateRequest
} = require('../middleware/validation');

// Public routes - none for transactions (all require authentication)

// All routes require authentication
router.use(protect);

// Specific routes that must come before parameterized routes
router.get('/my-transactions', transactionController.getMyTransactions);
router.get('/admin/all', adminOnly, transactionController.getTransactions);
router.get('/admin/stats', adminOnly, transactionController.getTransactionStats);

// Create a new transaction
router.post('/', 
  createTransactionValidation,
  validateRequest,
  transactionController.createTransaction
);

// Parameterized routes (must come after specific routes)
router.get('/:id',
  validateObjectId,
  validateRequest,
  transactionController.getTransactionById
);

// Admin-only routes
router.put('/:id',
  adminOnly,
  validateObjectId,
  updateTransactionValidation,
  validateRequest,
  transactionController.updateTransaction
);

router.patch('/:id/complete',
  adminOnly,
  validateObjectId,
  markTransactionCompletedValidation,
  validateRequest,
  transactionController.markTransactionCompleted
);

router.patch('/:id/fail',
  adminOnly,
  validateObjectId,
  markTransactionFailedValidation,
  validateRequest,
  transactionController.markTransactionFailed
);

router.patch('/:id/refund',
  adminOnly,
  validateObjectId,
  processRefundValidation,
  validateRequest,
  transactionController.processRefund
);

router.delete('/:id',
  adminOnly,
  validateObjectId,
  validateRequest,
  transactionController.deleteTransaction
);

module.exports = router;
