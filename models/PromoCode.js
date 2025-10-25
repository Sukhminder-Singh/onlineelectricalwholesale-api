const mongoose = require('mongoose');

const PromoCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Promo code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    minlength: [3, 'Promo code must be at least 3 characters long'],
    maxlength: [20, 'Promo code cannot exceed 20 characters'],
    match: [/^[A-Z0-9]+$/, 'Promo code can only contain uppercase letters and numbers']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  discountType: {
    type: String,
    required: [true, 'Discount type is required'],
    enum: {
      values: ['percentage', 'fixed'],
      message: 'Discount type must be either percentage or fixed'
    }
  },
  discountValue: {
    type: Number,
    required: [true, 'Discount value is required'],
    min: [0.01, 'Discount value must be greater than 0']
  },
  minimumOrderValue: {
    type: Number,
    min: [0, 'Minimum order value cannot be negative'],
    default: 0
  },
  usageCount: {
    type: Number,
    default: 0,
    min: [0, 'Usage count cannot be negative']
  },
  usageLimit: {
    type: Number,
    min: [1, 'Usage limit must be at least 1'],
    default: null
  },
  usagePerCustomer: {
    type: Number,
    min: [1, 'Usage per customer must be at least 1'],
    default: null
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  applicableProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  allProducts: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for remaining usage
PromoCodeSchema.virtual('remainingUsage').get(function() {
  if (this.usageLimit === null) {
    return null; // Unlimited
  }
  return Math.max(0, this.usageLimit - this.usageCount);
});

// Virtual for checking if promo code is expired
PromoCodeSchema.virtual('isExpired').get(function() {
  return new Date() > this.endDate;
});

// Virtual for checking if promo code is currently valid (active and within date range)
PromoCodeSchema.virtual('isCurrentlyValid').get(function() {
  const now = new Date();
  return this.isActive && now >= this.startDate && now <= this.endDate;
});

// Pre-save validation
PromoCodeSchema.pre('save', function(next) {
  // Validate date range
  if (this.startDate >= this.endDate) {
    return next(new Error('End date must be after start date'));
  }

  // Validate discount value based on type
  if (this.discountType === 'percentage' && this.discountValue > 100) {
    return next(new Error('Percentage discount cannot exceed 100%'));
  }

  // Validate usage per customer vs total usage limit
  if (this.usagePerCustomer && this.usageLimit && this.usagePerCustomer > this.usageLimit) {
    return next(new Error('Usage per customer cannot exceed total usage limit'));
  }

  // Validate product application logic
  if (this.allProducts && this.applicableProducts.length > 0) {
    return next(new Error('Cannot have both allProducts true and specific applicable products'));
  }

  if (!this.allProducts && this.applicableProducts.length === 0) {
    return next(new Error('Must either apply to all products or specify applicable products'));
  }

  next();
});

// Instance method to check if promo code can be used
PromoCodeSchema.methods.canBeUsed = function(customerId = null, orderValue = 0, productIds = []) {
  // Check if active
  if (!this.isActive) {
    return { valid: false, reason: 'Promo code is not active' };
  }

  // Check date range
  const now = new Date();
  if (now < this.startDate) {
    return { valid: false, reason: 'Promo code is not yet valid' };
  }
  if (now > this.endDate) {
    return { valid: false, reason: 'Promo code has expired' };
  }

  // Check usage limit
  if (this.usageLimit && this.usageCount >= this.usageLimit) {
    return { valid: false, reason: 'Promo code usage limit exceeded' };
  }

  // Check minimum order value
  if (orderValue < this.minimumOrderValue) {
    return { 
      valid: false, 
      reason: `Minimum order value of $${this.minimumOrderValue} required` 
    };
  }

  // Check product applicability
  if (!this.allProducts && productIds.length > 0) {
    const hasApplicableProduct = productIds.some(productId => 
      this.applicableProducts.some(applicableId => 
        applicableId.toString() === productId.toString()
      )
    );
    if (!hasApplicableProduct) {
      return { valid: false, reason: 'Promo code not applicable to selected products' };
    }
  }

  return { valid: true };
};

// Instance method to calculate discount amount
PromoCodeSchema.methods.calculateDiscount = function(orderValue) {
  if (this.discountType === 'percentage') {
    return (orderValue * this.discountValue) / 100;
  } else {
    return Math.min(this.discountValue, orderValue);
  }
};

// Static method to generate unique code
PromoCodeSchema.statics.generateUniqueCode = async function(prefix = 'PROMO', length = 8) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    let code = prefix;
    const remainingLength = length - prefix.length;
    
    for (let i = 0; i < remainingLength; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    // Check if code already exists
    const existingCode = await this.findOne({ code });
    if (!existingCode) {
      return code;
    }
    
    attempts++;
  }
  
  throw new Error('Unable to generate unique promo code after maximum attempts');
};

// Indexes (code index is automatically created by unique: true in schema)
PromoCodeSchema.index({ isActive: 1 });
PromoCodeSchema.index({ startDate: 1, endDate: 1 });
PromoCodeSchema.index({ createdAt: -1 });
PromoCodeSchema.index({ usageCount: 1 });
PromoCodeSchema.index({ discountType: 1 });

module.exports = mongoose.model('PromoCode', PromoCodeSchema);