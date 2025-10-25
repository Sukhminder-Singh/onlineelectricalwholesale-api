const express = require('express');
const router = express.Router();
const addressController = require('../controllers/addressController');
const { protect } = require('../middleware/auth');
const {
  createAddressValidation,
  updateAddressValidation,
  validateAddressId,
  handleValidationErrors
} = require('../middleware/validation');

// All routes require authentication
router.use(protect);

// Get all addresses for the authenticated user
router.get('/',
  addressController.getUserAddresses
);

// Get user's default address
router.get('/default',
  addressController.getDefaultAddress
);

// Get addresses by type
router.get('/type/:addressType',
  addressController.getAddressesByType
);

// Get specific address by ID
router.get('/:addressId',
  validateAddressId,
  handleValidationErrors,
  addressController.getAddressById
);

// Create new address
router.post('/',
  createAddressValidation,
  handleValidationErrors,
  addressController.createAddress
);

// Update address
router.put('/:addressId',
  validateAddressId,
  updateAddressValidation,
  handleValidationErrors,
  addressController.updateAddress
);

// Set default address
router.patch('/:addressId/set-default',
  validateAddressId,
  handleValidationErrors,
  addressController.setDefaultAddress
);

// Delete address (soft delete)
router.delete('/:addressId',
  validateAddressId,
  handleValidationErrors,
  addressController.deleteAddress
);

module.exports = router;
