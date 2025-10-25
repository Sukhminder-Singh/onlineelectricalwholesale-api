const Address = require('../models/Address');
const User = require('../models/User');
const mongoose = require('mongoose');

// Get all addresses for a user
exports.getUserAddresses = async (req, res) => {
  try {
    const { addressType, isDefault } = req.query;
    const userId = req.user._id;

    // Build query
    const query = { user: userId, isActive: true };
    
    if (addressType) {
      query.addressType = addressType;
    }
    
    if (isDefault !== undefined) {
      query.isDefault = isDefault === 'true';
    }

    const addresses = await Address.find(query)
      .sort({ isDefault: -1, createdAt: -1 })
      .select('-__v');

    res.status(200).json({
      success: true,
      data: {
        addresses,
        count: addresses.length
      },
      message: 'Addresses retrieved successfully'
    });
  } catch (error) {
    console.error('Get user addresses error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while retrieving addresses'
      }
    });
  }
};

// Get address by ID
exports.getAddressById = async (req, res) => {
  try {
    const { addressId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid address ID format'
        }
      });
    }

    const address = await Address.findOne({
      _id: addressId,
      user: userId,
      isActive: true
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Address not found'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: address,
      message: 'Address retrieved successfully'
    });
  } catch (error) {
    console.error('Get address by ID error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while retrieving the address'
      }
    });
  }
};

// Get user's default address
exports.getDefaultAddress = async (req, res) => {
  try {
    const userId = req.user._id;

    const defaultAddress = await Address.getDefaultAddress(userId);

    if (!defaultAddress) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'No default address found'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: defaultAddress,
      message: 'Default address retrieved successfully'
    });
  } catch (error) {
    console.error('Get default address error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while retrieving the default address'
      }
    });
  }
};

// Create new address
exports.createAddress = async (req, res) => {
  try {
    const requesterId = req.user._id;
    const requesterRole = req.user.role;
    const targetUserId = (requesterRole === 'admin' && req.body.customerId) ? req.body.customerId : requesterId;

    // If admin provided customerId, make sure that user exists
    if (requesterRole === 'admin' && req.body.customerId) {
      const exists = await User.exists({ _id: req.body.customerId, isActive: true });
      if (!exists) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CUSTOMER',
            message: 'Specified customerId does not exist or is inactive'
          }
        });
      }
    }

    const addressData = {
      ...req.body,
      user: targetUserId
    };

    // Check if user wants to set this as default
    if (addressData.isDefault) {
      // Unset other default addresses
      await Address.updateMany(
        { user: targetUserId, isDefault: true },
        { isDefault: false }
      );
    }

    const address = new Address(addressData);
    await address.save();

    res.status(201).json({
      success: true,
      data: address,
      message: 'Address created successfully'
    });
  } catch (error) {
    console.error('Create address error:', error);

    if (error.name === 'ValidationError') {
      const details = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while creating the address'
      }
    });
  }
};

// Update address
exports.updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const userId = req.user._id;
    const updateData = { ...req.body };

    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid address ID format'
        }
      });
    }

    // Check if address exists and belongs to user
    const existingAddress = await Address.findOne({
      _id: addressId,
      user: userId,
      isActive: true
    });

    if (!existingAddress) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Address not found'
        }
      });
    }

    // If setting as default, unset other default addresses
    if (updateData.isDefault && !existingAddress.isDefault) {
      await Address.updateMany(
        { user: userId, _id: { $ne: addressId }, isDefault: true },
        { isDefault: false }
      );
    }

    const address = await Address.findByIdAndUpdate(
      addressId,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: address,
      message: 'Address updated successfully'
    });
  } catch (error) {
    console.error('Update address error:', error);

    if (error.name === 'ValidationError') {
      const details = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details
        }
      });
    }

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid address ID format'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while updating the address'
      }
    });
  }
};

// Set default address
exports.setDefaultAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid address ID format'
        }
      });
    }

    const address = await Address.setDefaultAddress(userId, addressId);

    res.status(200).json({
      success: true,
      data: address,
      message: 'Default address updated successfully'
    });
  } catch (error) {
    console.error('Set default address error:', error);

    if (error.message === 'Address not found or not accessible') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Address not found or not accessible'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while setting the default address'
      }
    });
  }
};

// Delete address (soft delete)
exports.deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid address ID format'
        }
      });
    }

    const address = await Address.findOne({
      _id: addressId,
      user: userId,
      isActive: true
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Address not found'
        }
      });
    }

    // Soft delete the address
    address.isActive = false;
    await address.save();

    res.status(200).json({
      success: true,
      message: 'Address deleted successfully'
    });
  } catch (error) {
    console.error('Delete address error:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid address ID format'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while deleting the address'
      }
    });
  }
};

// Get addresses by type
exports.getAddressesByType = async (req, res) => {
  try {
    const { addressType } = req.params;
    const userId = req.user._id;

    const validTypes = ['home', 'work', 'billing', 'shipping', 'other'];
    if (!validTypes.includes(addressType)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TYPE',
          message: 'Invalid address type. Must be one of: ' + validTypes.join(', ')
        }
      });
    }

    const addresses = await Address.getAddressesByType(userId, addressType);

    res.status(200).json({
      success: true,
      data: {
        addresses,
        count: addresses.length,
        addressType
      },
      message: `${addressType} addresses retrieved successfully`
    });
  } catch (error) {
    console.error('Get addresses by type error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while retrieving addresses by type'
      }
    });
  }
};
