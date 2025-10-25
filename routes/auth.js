const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect, restrictTo } = require('../middleware/auth');
const checkDBConnection = require('../middleware/dbConnection');
const {
  loginLimiter,
  registerLimiter,
  passwordResetLimiter
} = require('../middleware/rateLimit');
const {
  registerValidation,
  roleBasedLoginValidation,
  adminLoginValidation,
  customerLoginValidation,
  customerRequestOtpValidation,
  customerVerifyOtpValidation,
  updateProfileValidation,
  changePasswordValidation,
  createAdminValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  deactivateAccountValidation
} = require('../middleware/validation');

// Apply database connection check to all routes
router.use(checkDBConnection);
router.post('/register', registerLimiter, registerValidation, authController.register);
router.post('/login', loginLimiter, roleBasedLoginValidation, authController.loginWithRole);
router.post('/admin/login', loginLimiter, adminLoginValidation, authController.adminLogin);
router.post('/customer/login', loginLimiter, customerLoginValidation, authController.customerLogin);
router.post('/customer/request-otp', loginLimiter, customerRequestOtpValidation, authController.requestCustomerOtp);
router.post('/customer/verify-otp', loginLimiter, customerVerifyOtpValidation, authController.verifyCustomerOtp);
router.post('/create-admin', registerLimiter, createAdminValidation, authController.createAdmin);
router.post('/refresh-token', authController.refreshToken);
router.post('/forgot-password', passwordResetLimiter, forgotPasswordValidation, authController.forgotPassword);
router.put('/reset-password', passwordResetLimiter, resetPasswordValidation, authController.resetPassword);
router.get('/me', protect, authController.getMe);
router.put('/update-profile', protect, updateProfileValidation, authController.updateProfile);
router.put('/change-password', protect, changePasswordValidation, authController.changePassword);
router.put('/deactivate', protect, deactivateAccountValidation, authController.deactivateAccount);
router.post('/logout', protect, authController.logout);
router.get('/admin/users', protect, restrictTo('admin'), authController.getAllUsers);
router.get('/admin/users/stats', protect, restrictTo('admin'), authController.getUserStats);
router.get('/admin/users/:userId', protect, restrictTo('admin'), authController.getUserById);
router.put('/admin/reactivate/:userId', protect, restrictTo('admin'), authController.adminReactivateUser);

module.exports = router;