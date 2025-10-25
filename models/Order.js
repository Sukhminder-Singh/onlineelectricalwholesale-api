const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required']
  },
  productName: {
    type: String,
    required: [true, 'Product name is required']
  },
  sku: String,
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price cannot be negative']
  },
  totalPrice: {
    type: Number,
    required: [true, 'Total price is required'],
    min: [0, 'Total price cannot be negative']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%']
  },
  taxRate: {
    type: Number,
    default: 0,
    min: [0, 'Tax rate cannot be negative']
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: [0, 'Tax amount cannot be negative']
  }
}, { _id: false });

const ShippingAddressSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  company: {
    type: String,
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  addressLine1: {
    type: String,
    required: [true, 'Address line 1 is required'],
    trim: true,
    maxlength: [100, 'Address line 1 cannot exceed 100 characters']
  },
  addressLine2: {
    type: String,
    trim: true,
    maxlength: [100, 'Address line 2 cannot exceed 100 characters']
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
    maxlength: [50, 'City cannot exceed 50 characters']
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true,
    maxlength: [50, 'State cannot exceed 50 characters']
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true,
    maxlength: [50, 'Country cannot exceed 50 characters']
  },
  postalCode: {
    type: String,
    required: [true, 'Postal code is required'],
    trim: true,
    maxlength: [20, 'Postal code cannot exceed 20 characters']
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [20, 'Phone number cannot exceed 20 characters']
  }
}, { _id: false });

const PaymentInfoSchema = new mongoose.Schema({
  paymentMethod: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: ['credit_card', 'bank_transfer', 'paypal', 'invoice', 'cash_on_delivery'],
    default: 'invoice'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded', 'partially_paid'],
    default: 'pending'
  },
  transactionId: String,
  paymentDate: Date,
  paymentDueDate: Date,
  paymentNotes: String
}, { _id: false });

const OrderTrackingSchema = new mongoose.Schema({
  status: {
    type: String,
    required: [true, 'Status is required']
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  notes: String,
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: [true, 'Order number is required']
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer is required']
  },
  customerEmail: {
    type: String,
    required: [true, 'Customer email is required'],
    lowercase: true,
    trim: true
  },
  customerPhone: {
    type: String,
    trim: true
  },
  items: {
    type: [OrderItemSchema],
    required: [true, 'Order items are required'],
    validate: {
      validator: function(items) {
        return items.length > 0;
      },
      message: 'Order must contain at least one item'
    }
  },
  subtotal: {
    type: Number,
    required: [true, 'Subtotal is required'],
    min: [0, 'Subtotal cannot be negative']
  },
  totalDiscount: {
    type: Number,
    default: 0,
    min: [0, 'Total discount cannot be negative']
  },
  totalTax: {
    type: Number,
    default: 0,
    min: [0, 'Total tax cannot be negative']
  },
  shippingCost: {
    type: Number,
    default: 0,
    min: [0, 'Shipping cost cannot be negative']
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    default: 'AUD',
    uppercase: true,
    minlength: 3,
    maxlength: 3
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  shippingAddress: {
    type: ShippingAddressSchema,
    required: [true, 'Shipping address is required']
  },
  billingAddress: {
    type: ShippingAddressSchema
  },
  paymentInfo: {
    type: PaymentInfoSchema,
    required: [true, 'Payment information is required']
  },
  shippingMethod: {
    type: String,
    enum: ['standard', 'express', 'overnight', 'pickup'],
    default: 'standard'
  },
  estimatedDeliveryDate: Date,
  actualDeliveryDate: Date,
  trackingNumber: String,
  trackingHistory: [OrderTrackingSchema],
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  internalNotes: {
    type: String,
    maxlength: [1000, 'Internal notes cannot exceed 1000 characters']
  },
  tags: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  cancelledAt: Date,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancellationReason: String,
  refundAmount: {
    type: Number,
    default: 0,
    min: [0, 'Refund amount cannot be negative']
  },
  refundDate: Date,
  refundReason: String
}, {
  timestamps: true
});

// Indexes for better query performance
OrderSchema.index({ customer: 1 });
OrderSchema.index({ customerEmail: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ 'paymentInfo.paymentStatus': 1 });
OrderSchema.index({ estimatedDeliveryDate: 1 });

// Pre-save middleware to generate order number
OrderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Find the last order number for today
    const lastOrder = await this.constructor.findOne({
      orderNumber: new RegExp(`^ORD-${year}${month}${day}-`)
    }).sort({ orderNumber: -1 });
    
    let sequence = 1;
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.orderNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }
    
    this.orderNumber = `ORD-${year}${month}${day}-${String(sequence).padStart(4, '0')}`;
  }
  next();
});

// Pre-save middleware to calculate totals
OrderSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    // Calculate subtotal from items
    this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
    
    // Calculate total discount
    this.totalDiscount = this.items.reduce((sum, item) => {
      const discountAmount = (item.unitPrice * item.quantity * item.discount) / 100;
      return sum + discountAmount;
    }, 0);
    
    // Calculate total tax
    this.totalTax = this.items.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
    
    // Calculate total amount
    this.totalAmount = this.subtotal - this.totalDiscount + this.totalTax + this.shippingCost;
  }
  next();
});

// Instance method to add tracking update
OrderSchema.methods.addTrackingUpdate = function(status, notes, updatedBy) {
  this.trackingHistory.push({
    status,
    notes,
    updatedBy,
    timestamp: new Date()
  });
  this.status = status;
};

// Instance method to calculate item totals
OrderSchema.methods.calculateItemTotals = function() {
  this.items.forEach(item => {
    const discountAmount = (item.unitPrice * item.quantity * item.discount) / 100;
    const subtotal = (item.unitPrice * item.quantity) - discountAmount;
    item.taxAmount = (subtotal * item.taxRate) / 100;
    item.totalPrice = subtotal + item.taxAmount;
  });
};

// Static method to get order statistics
OrderSchema.statics.getOrderStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' }
      }
    }
  ]);
  return stats;
};

// Static method to get orders by date range
OrderSchema.statics.getOrdersByDateRange = async function(startDate, endDate) {
  return this.find({
    createdAt: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('Order', OrderSchema);