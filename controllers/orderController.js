const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Address = require('../models/Address');
const OrderNotificationService = require('../services/OrderNotificationService');

// Create a new order
exports.createOrder = async (req, res) => {
  try {
    const orderData = req.body;
    
    // Set customer details from authenticated user token
    orderData.customer = req.user._id;
    orderData.customerEmail = req.user.email;
    orderData.customerPhone = req.user.phoneNumber || orderData.customerPhone;

    // Validate and populate product information
    if (!orderData.items || orderData.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item'
      });
    }

    // Validate products and calculate prices
    for (let item of orderData.items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product with ID ${item.product} not found`
        });
      }
      
      // Auto-populate product information
      item.productName = product.productName;
      item.sku = product.sku;
      
      // Use provided price or product price
      if (!item.unitPrice) {
        item.unitPrice = parseFloat(product.price) || 0;
      }
      
      // Calculate total price for item
      const discountAmount = (item.unitPrice * item.quantity * (item.discount || 0)) / 100;
      const subtotal = (item.unitPrice * item.quantity) - discountAmount;
      item.taxAmount = (subtotal * (item.taxRate || 0)) / 100;
      item.totalPrice = subtotal + item.taxAmount;
    }

    // Auto-populate shipping address from user's default address if not provided
    if (!orderData.shippingAddress) {
      const defaultAddress = await Address.getDefaultAddress(req.user._id);
      if (defaultAddress) {
        orderData.shippingAddress = {
          addressLine1: defaultAddress.street,
          addressLine2: defaultAddress.street2 || '',
          city: defaultAddress.city,
          state: defaultAddress.state || '',
          country: defaultAddress.country || 'Australia',
          postalCode: defaultAddress.postalCode || '',
          phone: req.user.phoneNumber || ''
        };
      } else {
        return res.status(400).json({
          success: false,
          message: 'No shipping address provided and no default address found. Please add an address first.'
        });
      }
    }

    // Use billing address as shipping address if not provided
    if (!orderData.shippingAddress && orderData.billingAddress) {
      orderData.shippingAddress = orderData.billingAddress;
    }

    // Set default payment info if not provided
    if (!orderData.paymentInfo) {
      orderData.paymentInfo = {
        paymentMethod: 'invoice',
        paymentStatus: 'pending'
      };
    }

    const order = new Order(orderData);
    
    // Add initial tracking entry
    order.addTrackingUpdate('pending', 'Order created', req.user._id);
    
    await order.save();

    // Populate customer and product details for response
    await order.populate('customer', 'username email firstName lastName phoneNumber');
    await order.populate('items.product', 'productName sku price');

    // Send SMS notification to customer (async, don't wait for it)
    OrderNotificationService.sendOrderConfirmation(order, order.customer)
      .then(success => {
        if (success) {
          console.log(`✅ Order confirmation SMS sent to ${order.customer.phoneNumber}`);
        } else {
          console.log(`⚠️ Failed to send order confirmation SMS to ${order.customer.phoneNumber}`);
        }
      })
      .catch(error => {
        console.error('❌ Error sending order confirmation SMS:', error.message);
      });

    // Send admin notification (async, don't wait for it)
    OrderNotificationService.sendAdminNotification(order, order.customer)
      .then(success => {
        if (success) {
          console.log(`✅ Admin notification SMS sent for order ${order.orderNumber}`);
        } else {
          console.log(`⚠️ Failed to send admin notification SMS`);
        }
      })
      .catch(error => {
        console.error('❌ Error sending admin notification SMS:', error.message);
      });

    res.status(201).json({
      success: true,
      data: order,
      message: 'Order created successfully'
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create order'
    });
  }
};

// Get all orders with filtering
exports.getOrders = async (req, res) => {
  try {
    const {
      status,
      paymentStatus,
      customer,
      dateFrom,
      dateTo,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    // If user is not admin, only show their orders
    if (req.user.role !== 'admin') {
      filter.customer = req.user._id;
    } else if (customer) {
      filter.customer = customer;
    }

    if (status) filter.status = status;
    if (paymentStatus) filter['paymentInfo.paymentStatus'] = paymentStatus;
    
    // Date range filter
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    // Search in order number, customer email, or customer name
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { orderNumber: searchRegex },
        { customerEmail: searchRegex },
        { 'shippingAddress.firstName': searchRegex },
        { 'shippingAddress.lastName': searchRegex }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const orders = await Order.find(filter)
      .populate('customer', 'username email firstName lastName')
      .populate('items.product', 'productName sku price mainImage')
      .sort(sortOptions);

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve orders'
    });
  }
};

// Get single order by ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'username email firstName lastName phone')
      .populate('items.product', 'productName sku price mainImage stock')
      .populate('trackingHistory.updatedBy', 'username firstName lastName');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user has permission to view this order
    if (req.user.role !== 'admin' && order.customer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this order'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve order'
    });
  }
};

// Update order (admin only for most fields, customers can update limited fields)
exports.updateOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check permissions
    const isAdmin = req.user.role === 'admin';
    const isOwner = order.customer.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this order'
      });
    }

    const updateData = req.body;

    // Restrict what non-admin users can update
    if (!isAdmin) {
      const allowedFields = ['shippingAddress', 'billingAddress', 'notes'];
      const updates = {};
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          updates[field] = updateData[field];
        }
      });
      Object.assign(order, updates);
    } else {
      // Admin can update most fields
      const restrictedFields = ['_id', 'orderNumber', 'customer', 'createdAt', 'updatedAt'];
      restrictedFields.forEach(field => delete updateData[field]);
      Object.assign(order, updateData);
    }

    await order.save();

    // Populate for response
    await order.populate('customer', 'username email firstName lastName');
    await order.populate('items.product', 'productName sku price');

    res.json({
      success: true,
      data: order,
      message: 'Order updated successfully'
    });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update order'
    });
  }
};

// Update order status (admin only)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Add tracking update
    order.addTrackingUpdate(status, notes, req.user._id);
    
    // Set special timestamps based on status
    if (status === 'delivered' && !order.actualDeliveryDate) {
      order.actualDeliveryDate = new Date();
    }
    
    if (status === 'cancelled') {
      order.cancelledAt = new Date();
      order.cancelledBy = req.user._id;
      if (notes) order.cancellationReason = notes;
    }

    await order.save();

    // Populate customer for SMS notification
    await order.populate('customer', 'username email firstName lastName phoneNumber');

    // Send SMS notification to customer (async, don't wait for it)
    OrderNotificationService.sendOrderStatusUpdate(order, order.customer, status, notes)
      .then(success => {
        if (success) {
          console.log(`✅ Order status update SMS sent to ${order.customer.phoneNumber}`);
        } else {
          console.log(`⚠️ Failed to send order status update SMS to ${order.customer.phoneNumber}`);
        }
      })
      .catch(error => {
        console.error('❌ Error sending order status update SMS:', error.message);
      });

    res.json({
      success: true,
      data: order,
      message: 'Order status updated successfully'
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update order status'
    });
  }
};

// Cancel order
exports.cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check permissions
    const isAdmin = req.user.role === 'admin';
    const isOwner = order.customer.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to cancel this order'
      });
    }

    // Check if order can be cancelled
    if (['shipped', 'delivered', 'cancelled'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled when status is ${order.status}`
      });
    }

    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancelledBy = req.user._id;
    order.cancellationReason = reason || 'Order cancelled by user';
    
    order.addTrackingUpdate('cancelled', reason || 'Order cancelled', req.user._id);

    await order.save();

    res.json({
      success: true,
      data: order,
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to cancel order'
    });
  }
};

// Delete order (admin only - soft delete)
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    order.isActive = false;
    await order.save();

    res.json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete order'
    });
  }
};

// Get order statistics (admin only)
exports.getOrderStats = async (req, res) => {
  try {
    const stats = await Order.getOrderStats();
    
    // Additional statistics
    const totalOrders = await Order.countDocuments({ isActive: true });
    const totalRevenue = await Order.aggregate([
      { $match: { isActive: true, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    const recentOrders = await Order.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('customer', 'username firstName lastName');

    res.json({
      success: true,
      data: {
        statusStats: stats,
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        recentOrders
      }
    });
  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve order statistics'
    });
  }
};

// Get user's orders
exports.getMyOrders = async (req, res) => {
  try {
    const {
      status,
      dateFrom,
      dateTo
    } = req.query;

    const filter = { customer: req.user._id, isActive: true };
    
    if (status) filter.status = status;
    
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const orders = await Order.find(filter)
      .populate('items.product', 'productName sku price mainImage')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Get my orders error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve your orders'
    });
  }
};