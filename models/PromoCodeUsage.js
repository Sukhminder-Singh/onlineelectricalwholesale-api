const mongoose = require('mongoose');

const PromoCodeUsageSchema = new mongoose.Schema({
  promoCode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PromoCode',
    required: [true, 'Promo code reference is required']
  },
  customerId: {
    type: String,
    required: [true, 'Customer ID is required']
  },
  orderId: {
    type: String,
    required: [true, 'Order ID is required']
  },
  orderValue: {
    type: Number,
    required: [true, 'Order value is required'],
    min: [0, 'Order value cannot be negative']
  },
  discountAmount: {
    type: Number,
    required: [true, 'Discount amount is required'],
    min: [0, 'Discount amount cannot be negative']
  },
  discountType: {
    type: String,
    required: [true, 'Discount type is required'],
    enum: ['percentage', 'fixed']
  },
  discountValue: {
    type: Number,
    required: [true, 'Discount value is required']
  },
  productIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  usedAt: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
PromoCodeUsageSchema.index({ promoCode: 1, customerId: 1 });
PromoCodeUsageSchema.index({ promoCode: 1, usedAt: -1 });
PromoCodeUsageSchema.index({ customerId: 1, usedAt: -1 });
PromoCodeUsageSchema.index({ orderId: 1 }, { unique: true });
PromoCodeUsageSchema.index({ usedAt: -1 });

// Static method to get usage statistics for a promo code
PromoCodeUsageSchema.statics.getUsageStats = async function(promoCodeId, startDate = null, endDate = null) {
  const matchStage = { promoCode: new mongoose.Types.ObjectId(promoCodeId) };
  
  if (startDate && endDate) {
    matchStage.usedAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalUsage: { $sum: 1 },
        totalDiscountGiven: { $sum: '$discountAmount' },
        totalOrderValue: { $sum: '$orderValue' },
        uniqueCustomers: { $addToSet: '$customerId' },
        avgDiscountAmount: { $avg: '$discountAmount' },
        avgOrderValue: { $avg: '$orderValue' }
      }
    }
  ]);

  if (stats.length === 0) {
    return {
      totalUsage: 0,
      totalDiscountGiven: 0,
      totalOrderValue: 0,
      uniqueCustomerCount: 0,
      avgDiscountAmount: 0,
      avgOrderValue: 0
    };
  }

  const result = stats[0];
  return {
    totalUsage: result.totalUsage,
    totalDiscountGiven: result.totalDiscountGiven,
    totalOrderValue: result.totalOrderValue,
    uniqueCustomerCount: result.uniqueCustomers.length,
    avgDiscountAmount: result.avgDiscountAmount,
    avgOrderValue: result.avgOrderValue
  };
};

// Static method to get usage by date range
PromoCodeUsageSchema.statics.getUsageByDateRange = async function(promoCodeId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        promoCode: new mongoose.Types.ObjectId(promoCodeId),
        usedAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$usedAt' },
          month: { $month: '$usedAt' },
          day: { $dayOfMonth: '$usedAt' }
        },
        count: { $sum: 1 },
        totalDiscount: { $sum: '$discountAmount' }
      }
    },
    {
      $project: {
        _id: 0,
        date: {
          $dateFromParts: {
            year: '$_id.year',
            month: '$_id.month',
            day: '$_id.day'
          }
        },
        count: 1,
        totalDiscount: 1
      }
    },
    { $sort: { date: 1 } }
  ]);
};

// Static method to get top customers for a promo code
PromoCodeUsageSchema.statics.getTopCustomers = async function(promoCodeId, limit = 10) {
  return this.aggregate([
    { $match: { promoCode: new mongoose.Types.ObjectId(promoCodeId) } },
    {
      $group: {
        _id: '$customerId',
        usageCount: { $sum: 1 },
        totalDiscount: { $sum: '$discountAmount' },
        totalOrderValue: { $sum: '$orderValue' },
        lastUsed: { $max: '$usedAt' }
      }
    },
    {
      $project: {
        customerId: '$_id',
        _id: 0,
        usageCount: 1,
        totalDiscount: 1,
        totalOrderValue: 1,
        lastUsed: 1
      }
    },
    { $sort: { usageCount: -1, totalOrderValue: -1 } },
    { $limit: limit }
  ]);
};

// Static method to check customer usage count for a promo code
PromoCodeUsageSchema.statics.getCustomerUsageCount = async function(promoCodeId, customerId) {
  return this.countDocuments({
    promoCode: promoCodeId,
    customerId: customerId
  });
};

// Instance method to validate usage data
PromoCodeUsageSchema.methods.validateUsage = function() {
  // Ensure discount amount is calculated correctly
  if (this.discountType === 'percentage') {
    const expectedDiscount = (this.orderValue * this.discountValue) / 100;
    if (Math.abs(this.discountAmount - expectedDiscount) > 0.01) {
      throw new Error('Discount amount does not match percentage calculation');
    }
  } else if (this.discountType === 'fixed') {
    const expectedDiscount = Math.min(this.discountValue, this.orderValue);
    if (Math.abs(this.discountAmount - expectedDiscount) > 0.01) {
      throw new Error('Discount amount does not match fixed calculation');
    }
  }

  // Ensure discount doesn't exceed order value
  if (this.discountAmount > this.orderValue) {
    throw new Error('Discount amount cannot exceed order value');
  }
};

// Pre-save validation
PromoCodeUsageSchema.pre('save', function(next) {
  try {
    this.validateUsage();
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('PromoCodeUsage', PromoCodeUsageSchema);