const PromoCode = require('../models/PromoCode');
const PromoCodeUsage = require('../models/PromoCodeUsage');
const Product = require('../models/Product');
const mongoose = require('mongoose');

// Helper function to build search query
const buildSearchQuery = (search) => {
  if (!search) return {};
  
  return {
    $or: [
      { code: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ]
  };
};

// Helper function to build status filter
const buildStatusFilter = (status) => {
  const now = new Date();
  
  switch (status) {
    case 'active':
      return {
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now }
      };
    case 'inactive':
      return {
        $or: [
          { isActive: false },
          { endDate: { $lt: now } }
        ]
      };
    case 'expired':
      return { endDate: { $lt: now } };
    case 'upcoming':
      return { startDate: { $gt: now } };
    default:
      return {};
  }
};

// Get all promo codes with filtering, searching, and pagination
exports.getAllPromoCodes = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status = 'all',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {
      ...buildSearchQuery(search),
      ...buildStatusFilter(status)
    };

    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const [promoCodes, total] = await Promise.all([
      PromoCode.find(query)
        .populate('applicableProducts', 'productName sku price mainImage')
        .populate('createdBy', 'username firstName lastName')
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit)),
      PromoCode.countDocuments(query)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        promoCodes,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages
        }
      },
      message: 'Promo codes retrieved successfully'
    });
  } catch (error) {
    console.error('Get promo codes error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while retrieving promo codes'
      }
    });
  }
};

// Get promo code by ID
exports.getPromoCodeById = async (req, res) => {
  try {
    const promoCode = await PromoCode.findById(req.params.id)
      .populate('applicableProducts', 'productName sku price mainImage')
      .populate('createdBy', 'username firstName lastName');

    if (!promoCode) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Promo code not found'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: promoCode,
      message: 'Promo code retrieved successfully'
    });
  } catch (error) {
    console.error('Get promo code by ID error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid promo code ID format'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while retrieving the promo code'
      }
    });
  }
};

// Create new promo code
exports.createPromoCode = async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minimumOrderValue,
      usageLimit,
      usagePerCustomer,
      startDate,
      endDate,
      isActive = true,
      applicableProducts = [],
      allProducts = false
    } = req.body;

    // Check if code already exists
    const existingCode = await PromoCode.findOne({ code: code.toUpperCase() });
    if (existingCode) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_CODE',
          message: 'Promo code already exists'
        }
      });
    }

    // Validate applicable products if not all products
    if (!allProducts && applicableProducts.length > 0) {
      const validProducts = await Product.find({
        _id: { $in: applicableProducts }
      });
      
      if (validProducts.length !== applicableProducts.length) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PRODUCTS',
            message: 'One or more specified products do not exist'
          }
        });
      }
    }

    // Create promo code
    const promoCode = new PromoCode({
      code: code.toUpperCase(),
      description,
      discountType,
      discountValue,
      minimumOrderValue,
      usageLimit,
      usagePerCustomer,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive,
      applicableProducts: allProducts ? [] : applicableProducts,
      allProducts,
      createdBy: req.user._id
    });

    await promoCode.save();

    // Populate the response
    await promoCode.populate('applicableProducts', 'productName sku price mainImage');
    await promoCode.populate('createdBy', 'username firstName lastName');

    res.status(201).json({
      success: true,
      data: promoCode,
      message: 'Promo code created successfully'
    });
  } catch (error) {
    console.error('Create promo code error:', error);

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
        message: 'An error occurred while creating the promo code'
      }
    });
  }
};

// Update promo code
exports.updatePromoCode = async (req, res) => {
  try {
    const promoCodeId = req.params.id;
    const updateData = { ...req.body };

    // Check if promo code exists
    const existingPromoCode = await PromoCode.findById(promoCodeId);
    if (!existingPromoCode) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Promo code not found'
        }
      });
    }

    // Check if code is being changed and if new code already exists
    if (updateData.code && updateData.code.toUpperCase() !== existingPromoCode.code) {
      const duplicateCode = await PromoCode.findOne({ 
        code: updateData.code.toUpperCase(),
        _id: { $ne: promoCodeId }
      });
      
      if (duplicateCode) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_CODE',
            message: 'Promo code already exists'
          }
        });
      }
      updateData.code = updateData.code.toUpperCase();
    }

    // Validate applicable products if being updated
    if (updateData.applicableProducts && !updateData.allProducts) {
      const validProducts = await Product.find({
        _id: { $in: updateData.applicableProducts }
      });
      
      if (validProducts.length !== updateData.applicableProducts.length) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PRODUCTS',
            message: 'One or more specified products do not exist'
          }
        });
      }
    }

    // Clear applicable products if allProducts is being set to true
    if (updateData.allProducts) {
      updateData.applicableProducts = [];
    }

    // Convert date strings to Date objects if provided
    if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
    if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);

    // Update promo code
    const promoCode = await PromoCode.findByIdAndUpdate(
      promoCodeId,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('applicableProducts', 'productName sku price mainImage')
      .populate('createdBy', 'username firstName lastName');

    res.status(200).json({
      success: true,
      data: promoCode,
      message: 'Promo code updated successfully'
    });
  } catch (error) {
    console.error('Update promo code error:', error);

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
          message: 'Invalid promo code ID format'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while updating the promo code'
      }
    });
  }
};

// Delete promo code
exports.deletePromoCode = async (req, res) => {
  try {
    const promoCode = await PromoCode.findById(req.params.id);
    
    if (!promoCode) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Promo code not found'
        }
      });
    }

    // Check if promo code has been used
    const usageCount = await PromoCodeUsage.countDocuments({ promoCode: req.params.id });
    if (usageCount > 0) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'BUSINESS_LOGIC_ERROR',
          message: 'Cannot delete promo code that has been used. Consider deactivating it instead.',
          details: { usageCount }
        }
      });
    }

    await PromoCode.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Promo code deleted successfully'
    });
  } catch (error) {
    console.error('Delete promo code error:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid promo code ID format'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
      }
    });
  }
};

// Toggle promo code status
exports.togglePromoCodeStatus = async (req, res) => {
  try {
    const promoCode = await PromoCode.findById(req.params.id);
    
    if (!promoCode) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Promo code not found'
        }
      });
    }

    promoCode.isActive = !promoCode.isActive;
    await promoCode.save();

    await promoCode.populate('applicableProducts', 'productName sku price mainImage');
    await promoCode.populate('createdBy', 'username firstName lastName');

    res.status(200).json({
      success: true,
      data: promoCode,
      message: `Promo code ${promoCode.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Toggle promo code status error:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid promo code ID format'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while toggling promo code status'
      }
    });
  }
};

// Validate promo code
exports.validatePromoCode = async (req, res) => {
  try {
    const { code, customerId, orderValue = 0, productIds = [] } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Promo code is required'
        }
      });
    }

    // Find promo code
    const promoCode = await PromoCode.findOne({ code: code.toUpperCase() })
      .populate('applicableProducts', 'productName sku price');

    if (!promoCode) {
      return res.status(200).json({
        success: true,
        data: {
          isValid: false,
          reason: 'Promo code not found'
        },
        message: 'Promo code validation completed'
      });
    }

    // Check basic validity
    const basicValidation = promoCode.canBeUsed(customerId, orderValue, productIds);
    if (!basicValidation.valid) {
      return res.status(200).json({
        success: true,
        data: {
          isValid: false,
          promoCode,
          reason: basicValidation.reason
        },
        message: 'Promo code validation completed'
      });
    }

    // Check customer usage limit if specified
    if (promoCode.usagePerCustomer && customerId) {
      const customerUsageCount = await PromoCodeUsage.getCustomerUsageCount(
        promoCode._id,
        customerId
      );
      
      if (customerUsageCount >= promoCode.usagePerCustomer) {
        return res.status(200).json({
          success: true,
          data: {
            isValid: false,
            promoCode,
            reason: 'Customer usage limit exceeded'
          },
          message: 'Promo code validation completed'
        });
      }
    }

    // Calculate discount
    const discountAmount = promoCode.calculateDiscount(orderValue);

    res.status(200).json({
      success: true,
      data: {
        isValid: true,
        promoCode,
        discountAmount
      },
      message: 'Promo code is valid'
    });
  } catch (error) {
    console.error('Validate promo code error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while validating the promo code'
      }
    });
  }
};

// Get promo code usage statistics
exports.getPromoCodeStatistics = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    // Check if promo code exists
    const promoCode = await PromoCode.findById(id);
    if (!promoCode) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Promo code not found'
        }
      });
    }

    // Get basic usage statistics
    const stats = await PromoCodeUsage.getUsageStats(id, startDate, endDate);
    
    // Get usage by date
    const usageByDate = startDate && endDate 
      ? await PromoCodeUsage.getUsageByDateRange(id, startDate, endDate)
      : [];
    
    // Get top customers
    const topCustomers = await PromoCodeUsage.getTopCustomers(id, 10);

    // Calculate remaining usage
    const remainingUsage = promoCode.usageLimit 
      ? Math.max(0, promoCode.usageLimit - promoCode.usageCount)
      : null;

    res.status(200).json({
      success: true,
      data: {
        totalUsage: stats.totalUsage,
        remainingUsage,
        totalDiscountGiven: stats.totalDiscountGiven,
        totalOrderValue: stats.totalOrderValue,
        uniqueCustomerCount: stats.uniqueCustomerCount,
        avgDiscountAmount: stats.avgDiscountAmount,
        avgOrderValue: stats.avgOrderValue,
        usageByDate,
        topCustomers
      },
      message: 'Usage statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Get promo code statistics error:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid promo code ID format'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while retrieving statistics'
      }
    });
  }
};

// Duplicate promo code
exports.duplicatePromoCode = async (req, res) => {
  try {
    const { id } = req.params;
    const { newCode, startDate, endDate } = req.body;

    // Find original promo code
    const originalPromoCode = await PromoCode.findById(id);
    if (!originalPromoCode) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Promo code not found'
        }
      });
    }

    // Check if new code already exists
    const existingCode = await PromoCode.findOne({ code: newCode.toUpperCase() });
    if (existingCode) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_CODE',
          message: 'New promo code already exists'
        }
      });
    }

    // Create duplicate with new code and dates
    const duplicateData = {
      ...originalPromoCode.toObject(),
      _id: undefined,
      code: newCode.toUpperCase(),
      startDate: startDate ? new Date(startDate) : originalPromoCode.startDate,
      endDate: endDate ? new Date(endDate) : originalPromoCode.endDate,
      usageCount: 0,
      createdBy: req.user._id,
      createdAt: undefined,
      updatedAt: undefined
    };

    const duplicatePromoCode = new PromoCode(duplicateData);
    await duplicatePromoCode.save();

    // Populate the response
    await duplicatePromoCode.populate('applicableProducts', 'productName sku price mainImage');
    await duplicatePromoCode.populate('createdBy', 'username firstName lastName');

    res.status(201).json({
      success: true,
      data: duplicatePromoCode,
      message: 'Promo code duplicated successfully'
    });
  } catch (error) {
    console.error('Duplicate promo code error:', error);

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
          message: 'Invalid promo code ID format'
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while duplicating the promo code'
      }
    });
  }
};

// Generate unique promo code
exports.generatePromoCode = async (req, res) => {
  try {
    const { prefix = 'PROMO', length = 8 } = req.body;

    // Validate input
    if (length < 4 || length > 20) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Code length must be between 4 and 20 characters'
        }
      });
    }

    if (prefix.length >= length) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Prefix length must be less than total code length'
        }
      });
    }

    const generatedCode = await PromoCode.generateUniqueCode(prefix, length);

    res.status(200).json({
      success: true,
      data: {
        code: generatedCode
      },
      message: 'Promo code generated successfully'
    });
  } catch (error) {
    console.error('Generate promo code error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while generating the promo code'
      }
    });
  }
};

// Apply promo code (for actual usage tracking)
exports.applyPromoCode = async (req, res) => {
  try {
    const {
      code,
      customerId,
      orderId,
      orderValue,
      productIds = []
    } = req.body;

    // Validate required fields
    if (!code || !customerId || !orderId || orderValue === undefined) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Code, customer ID, order ID, and order value are required'
        }
      });
    }

    // Find and validate promo code
    const promoCode = await PromoCode.findOne({ code: code.toUpperCase() });
    if (!promoCode) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Promo code not found'
        }
      });
    }

    // Check if order has already used a promo code
    const existingUsage = await PromoCodeUsage.findOne({ orderId });
    if (existingUsage) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'BUSINESS_LOGIC_ERROR',
          message: 'This order has already used a promo code'
        }
      });
    }

    // Validate promo code
    const validation = promoCode.canBeUsed(customerId, orderValue, productIds);
    if (!validation.valid) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'BUSINESS_LOGIC_ERROR',
          message: validation.reason
        }
      });
    }

    // Check customer usage limit
    if (promoCode.usagePerCustomer) {
      const customerUsageCount = await PromoCodeUsage.getCustomerUsageCount(
        promoCode._id,
        customerId
      );
      
      if (customerUsageCount >= promoCode.usagePerCustomer) {
        return res.status(422).json({
          success: false,
          error: {
            code: 'BUSINESS_LOGIC_ERROR',
            message: 'Customer usage limit exceeded'
          }
        });
      }
    }

    // Calculate discount
    const discountAmount = promoCode.calculateDiscount(orderValue);

    // Create usage record
    const usage = new PromoCodeUsage({
      promoCode: promoCode._id,
      customerId,
      orderId,
      orderValue,
      discountAmount,
      discountType: promoCode.discountType,
      discountValue: promoCode.discountValue,
      productIds: productIds.filter(id => mongoose.Types.ObjectId.isValid(id)),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Use transaction to ensure data consistency
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Save usage record
      await usage.save({ session });
      
      // Update promo code usage count
      await PromoCode.findByIdAndUpdate(
        promoCode._id,
        { $inc: { usageCount: 1 } },
        { session }
      );

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    res.status(200).json({
      success: true,
      data: {
        promoCode,
        discountAmount,
        usage
      },
      message: 'Promo code applied successfully'
    });
  } catch (error) {
    console.error('Apply promo code error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while applying the promo code'
      }
    });
  }
};