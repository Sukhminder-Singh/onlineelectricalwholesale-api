const Transaction = require('../models/Transaction');
const Order = require('../models/Order');
const User = require('../models/User');

// Create a new transaction
exports.createTransaction = async (req, res) => {
  try {
    const transactionData = req.body;
    
    // Validate required fields
    if (!transactionData.orderId || !transactionData.customer || !transactionData.amount) {
      return res.status(400).json({
        success: false,
        message: 'Order ID, customer information, and amount are required'
      });
    }

    // Check if order exists
    const order = await Order.findOne({ orderNumber: transactionData.orderId });
    if (!order) {
      return res.status(400).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if transaction already exists for this order
    const existingTransaction = await Transaction.findOne({ orderId: transactionData.orderId });
    if (existingTransaction) {
      return res.status(400).json({
        success: false,
        message: 'Transaction already exists for this order'
      });
    }

    // Set processed by if not provided
    if (!transactionData.processedBy) {
      transactionData.processedBy = req.user._id;
    }

    const transaction = new Transaction(transactionData);
    await transaction.save();

    // Populate customer details for response
    await transaction.populate('processedBy', 'username firstName lastName');

    res.status(201).json({
      success: true,
      data: transaction,
      message: 'Transaction created successfully'
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create transaction'
    });
  }
};

// Get all transactions with filtering
exports.getTransactions = async (req, res) => {
  try {
    const {
      status,
      paymentMethod,
      customer,
      dateFrom,
      dateTo,
      search,
      sortBy = 'transactionDate',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = { isActive: true };
    
    // If user is not admin, only show transactions for their orders
    if (req.user.role !== 'admin') {
      const userOrders = await Order.find({ customer: req.user._id }).select('orderNumber');
      const orderNumbers = userOrders.map(order => order.orderNumber);
      filter.orderId = { $in: orderNumbers };
    } else if (customer) {
      filter['customer.email'] = customer;
    }

    if (status) filter.status = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    
    // Date range filter
    if (dateFrom || dateTo) {
      filter.transactionDate = {};
      if (dateFrom) filter.transactionDate.$gte = new Date(dateFrom);
      if (dateTo) filter.transactionDate.$lte = new Date(dateTo);
    }

    // Search in transaction ID, order ID, customer name, or customer email
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { transactionId: searchRegex },
        { orderId: searchRegex },
        { 'customer.name': searchRegex },
        { 'customer.email': searchRegex },
        { description: searchRegex }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const transactions = await Transaction.find(filter)
      .populate('processedBy', 'username firstName lastName')
      .sort(sortOptions);

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve transactions'
    });
  }
};

// Get single transaction by ID
exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('processedBy', 'username firstName lastName');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Check if user has permission to view this transaction
    if (req.user.role !== 'admin') {
      const order = await Order.findOne({ orderNumber: transaction.orderId });
      if (!order || order.customer.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this transaction'
        });
      }
    }

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve transaction'
    });
  }
};

// Update transaction (admin only)
exports.updateTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    const updateData = req.body;
    
    // Restrict what can be updated
    const restrictedFields = ['_id', 'transactionId', 'createdAt', 'updatedAt'];
    restrictedFields.forEach(field => delete updateData[field]);
    
    Object.assign(transaction, updateData);
    await transaction.save();

    // Populate for response
    await transaction.populate('processedBy', 'username firstName lastName');

    res.json({
      success: true,
      data: transaction,
      message: 'Transaction updated successfully'
    });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update transaction'
    });
  }
};

// Mark transaction as completed
exports.markTransactionCompleted = async (req, res) => {
  try {
    const { gatewayTransactionId, gatewayResponse } = req.body;
    
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    if (transaction.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending transactions can be marked as completed'
      });
    }

    transaction.markAsCompleted(gatewayTransactionId, gatewayResponse, req.user._id);
    await transaction.save();

    // Update order payment status
    const order = await Order.findOne({ orderNumber: transaction.orderId });
    if (order) {
      order.paymentInfo.paymentStatus = 'paid';
      order.paymentInfo.transactionId = transaction.transactionId;
      order.paymentInfo.paymentDate = new Date();
      await order.save();
    }

    res.json({
      success: true,
      data: transaction,
      message: 'Transaction marked as completed successfully'
    });
  } catch (error) {
    console.error('Mark transaction completed error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to mark transaction as completed'
    });
  }
};

// Mark transaction as failed
exports.markTransactionFailed = async (req, res) => {
  try {
    const { gatewayResponse } = req.body;
    
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    if (transaction.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending transactions can be marked as failed'
      });
    }

    transaction.markAsFailed(gatewayResponse, req.user._id);
    await transaction.save();

    // Update order payment status
    const order = await Order.findOne({ orderNumber: transaction.orderId });
    if (order) {
      order.paymentInfo.paymentStatus = 'failed';
      await order.save();
    }

    res.json({
      success: true,
      data: transaction,
      message: 'Transaction marked as failed successfully'
    });
  } catch (error) {
    console.error('Mark transaction failed error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to mark transaction as failed'
    });
  }
};

// Process refund
exports.processRefund = async (req, res) => {
  try {
    const { refundAmount, refundReason } = req.body;
    
    if (!refundAmount || refundAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid refund amount is required'
      });
    }

    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    if (!['Completed', 'Partially Refunded'].includes(transaction.status)) {
      return res.status(400).json({
        success: false,
        message: 'Only completed or partially refunded transactions can be refunded'
      });
    }

    transaction.processRefund(refundAmount, refundReason, req.user._id);
    await transaction.save();

    res.json({
      success: true,
      data: transaction,
      message: 'Refund processed successfully'
    });
  } catch (error) {
    console.error('Process refund error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to process refund'
    });
  }
};

// Delete transaction (admin only - soft delete)
exports.deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    transaction.isActive = false;
    await transaction.save();

    res.json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete transaction'
    });
  }
};

// Get transaction statistics (admin only)
exports.getTransactionStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const stats = await Transaction.getTransactionStats();
    const revenueSummary = await Transaction.getRevenueSummary(startDate, endDate);
    
    // Additional statistics
    const totalTransactions = await Transaction.countDocuments({ isActive: true });
    const recentTransactions = await Transaction.find({ isActive: true })
      .sort({ transactionDate: -1 })
      .limit(5)
      .populate('processedBy', 'username firstName lastName');

    res.json({
      success: true,
      data: {
        statusStats: stats,
        totalTransactions,
        revenueSummary,
        recentTransactions
      }
    });
  } catch (error) {
    console.error('Get transaction stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve transaction statistics'
    });
  }
};

// Get user's transactions
exports.getMyTransactions = async (req, res) => {
  try {
    const {
      status,
      dateFrom,
      dateTo
    } = req.query;

    // Get user's orders
    const userOrders = await Order.find({ customer: req.user._id }).select('orderNumber');
    const orderNumbers = userOrders.map(order => order.orderNumber);

    const filter = { 
      orderId: { $in: orderNumbers },
      isActive: true 
    };
    
    if (status) filter.status = status;
    
    if (dateFrom || dateTo) {
      filter.transactionDate = {};
      if (dateFrom) filter.transactionDate.$gte = new Date(dateFrom);
      if (dateTo) filter.transactionDate.$lte = new Date(dateTo);
    }

    const transactions = await Transaction.find(filter)
      .populate('processedBy', 'username firstName lastName')
      .sort({ transactionDate: -1 });

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Get my transactions error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve your transactions'
    });
  }
};
