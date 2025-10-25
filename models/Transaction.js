const mongoose = require('mongoose');

const CustomerInfoSchema = new mongoose.Schema({
  id: {
    type: String,
    required: [true, 'Customer ID is required']
  },
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    maxlength: [100, 'Customer name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Customer email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  }
}, { _id: false });

const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: [true, 'Invoice number is required'],
    trim: true
  },
  invoiceDate: {
    type: Date,
    required: [true, 'Invoice date is required']
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  status: {
    type: String,
    enum: ['Pending', 'Paid', 'Overdue', 'Cancelled'],
    default: 'Pending'
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  }
}, { _id: false });

const TransactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    unique: true,
    required: [true, 'Transaction ID is required'],
    trim: true
  },
  orderId: {
    type: String,
    required: [true, 'Order ID is required'],
    trim: true
  },
  customer: {
    type: CustomerInfoSchema,
    required: [true, 'Customer information is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  paymentMethod: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: ['Credit Card', 'Debit Card', 'Bank Transfer', 'PayPal', 'Cash', 'Check', 'Wire Transfer'],
    default: 'Credit Card'
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Failed', 'Cancelled', 'Refunded', 'Partially Refunded'],
    default: 'Pending'
  },
  transactionDate: {
    type: Date,
    required: [true, 'Transaction date is required'],
    default: Date.now
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    default: 'USD',
    uppercase: true,
    minlength: 3,
    maxlength: 3
  },
  fees: {
    type: Number,
    default: 0,
    min: [0, 'Fees cannot be negative']
  },
  netAmount: {
    type: Number,
    required: [true, 'Net amount is required'],
    min: [0, 'Net amount cannot be negative']
  },
  reference: {
    type: String,
    trim: true,
    maxlength: [100, 'Reference cannot exceed 100 characters']
  },
  invoice: {
    type: InvoiceSchema,
    required: [true, 'Invoice information is required']
  },
  // Additional fields for tracking and management
  gatewayTransactionId: {
    type: String,
    trim: true
  },
  gatewayResponse: {
    type: mongoose.Schema.Types.Mixed
  },
  refundAmount: {
    type: Number,
    default: 0,
    min: [0, 'Refund amount cannot be negative']
  },
  refundDate: Date,
  refundReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Refund reason cannot exceed 500 characters']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: Date
}, {
  timestamps: true
});

// Indexes for better query performance
TransactionSchema.index({ orderId: 1 });
TransactionSchema.index({ 'customer.email': 1 });
TransactionSchema.index({ status: 1 });
TransactionSchema.index({ transactionDate: -1 });
TransactionSchema.index({ 'invoice.invoiceNumber': 1 });
TransactionSchema.index({ createdAt: -1 });

// Pre-save middleware to generate transaction ID
TransactionSchema.pre('save', async function(next) {
  if (this.isNew && !this.transactionId) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Find the last transaction ID for today
    const lastTransaction = await this.constructor.findOne({
      transactionId: new RegExp(`^TXN-${year}${month}${day}-`)
    }).sort({ transactionId: -1 });
    
    let sequence = 1;
    if (lastTransaction) {
      const lastSequence = parseInt(lastTransaction.transactionId.split('-')[2]);
      sequence = lastSequence + 1;
    }
    
    this.transactionId = `TXN-${year}${month}${day}-${String(sequence).padStart(3, '0')}`;
  }
  next();
});

// Pre-save middleware to calculate net amount
TransactionSchema.pre('save', function(next) {
  if (this.amount !== undefined && this.fees !== undefined) {
    this.netAmount = this.amount - this.fees;
  }
  next();
});

// Instance method to mark transaction as completed
TransactionSchema.methods.markAsCompleted = function(gatewayTransactionId, gatewayResponse, processedBy) {
  this.status = 'Completed';
  this.gatewayTransactionId = gatewayTransactionId;
  this.gatewayResponse = gatewayResponse;
  this.processedBy = processedBy;
  this.processedAt = new Date();
};

// Instance method to mark transaction as failed
TransactionSchema.methods.markAsFailed = function(gatewayResponse, processedBy) {
  this.status = 'Failed';
  this.gatewayResponse = gatewayResponse;
  this.processedBy = processedBy;
  this.processedAt = new Date();
};

// Instance method to process refund
TransactionSchema.methods.processRefund = function(refundAmount, refundReason, processedBy) {
  if (refundAmount > this.netAmount) {
    throw new Error('Refund amount cannot exceed net amount');
  }
  
  this.refundAmount = refundAmount;
  this.refundDate = new Date();
  this.refundReason = refundReason;
  this.processedBy = processedBy;
  
  if (refundAmount === this.netAmount) {
    this.status = 'Refunded';
  } else {
    this.status = 'Partially Refunded';
  }
};

// Static method to get transaction statistics
TransactionSchema.statics.getTransactionStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        totalNetAmount: { $sum: '$netAmount' },
        totalFees: { $sum: '$fees' }
      }
    }
  ]);
  return stats;
};

// Static method to get transactions by date range
TransactionSchema.statics.getTransactionsByDateRange = async function(startDate, endDate) {
  return this.find({
    transactionDate: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ transactionDate: -1 });
};

// Static method to get revenue summary
TransactionSchema.statics.getRevenueSummary = async function(startDate, endDate) {
  const matchStage = {};
  if (startDate && endDate) {
    matchStage.transactionDate = {
      $gte: startDate,
      $lte: endDate
    };
  }
  matchStage.status = 'Completed';

  const summary = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalTransactions: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        totalNetAmount: { $sum: '$netAmount' },
        totalFees: { $sum: '$fees' },
        averageTransactionValue: { $avg: '$amount' }
      }
    }
  ]);

  return summary[0] || {
    totalTransactions: 0,
    totalAmount: 0,
    totalNetAmount: 0,
    totalFees: 0,
    averageTransactionValue: 0
  };
};

module.exports = mongoose.model('Transaction', TransactionSchema);
