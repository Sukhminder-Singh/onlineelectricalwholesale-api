const { sendSMS } = require('../utils/sms');
const { logger } = require('../middleware/logger');

/**
 * Order Notification Service - Handles SMS notifications for order events
 */
class OrderNotificationService {
  /**
   * Send order confirmation SMS to customer
   * @param {object} order - Order object with populated customer data
   * @param {object} customer - Customer object with phone number
   * @returns {Promise<boolean>} Success status
   */
  static async sendOrderConfirmation(order, customer) {
    try {
      // Check if customer has phone number
      if (!customer.phoneNumber) {
        logger.warn(`Customer ${customer._id} has no phone number for SMS notification`);
        return false;
      }

      // Format order details for SMS
      const orderNumber = order.orderNumber || order._id.toString().slice(-8);
      const totalAmount = order.totalAmount ? `$${order.totalAmount.toFixed(2)}` : 'TBD';
      const itemCount = order.items ? order.items.length : 0;
      
      // Create SMS message
      const message = this.formatOrderConfirmationMessage({
        orderNumber,
        totalAmount,
        itemCount,
        customerName: customer.firstName || 'Customer',
        status: order.status || 'Pending'
      });

      // Send SMS - this now returns boolean instead of throwing
      const smsSent = await sendSMS(customer.phoneNumber, message, {
        senderId: process.env.SMS_SENDER_ID || 'OrderAlert',
        smsType: 'Transactional'
      });

      if (smsSent) {
        logger.info(`Order confirmation SMS sent to ${customer.phoneNumber} for order ${orderNumber}`);
      } else {
        logger.warn(`Failed to send order confirmation SMS to ${customer.phoneNumber} for order ${orderNumber}`);
      }

      return smsSent;

    } catch (error) {
      logger.error(`Unexpected error sending order confirmation SMS: ${error.message}`);
      return false;
    }
  }

  /**
   * Send order status update SMS to customer
   * @param {object} order - Order object
   * @param {object} customer - Customer object
   * @param {string} newStatus - New order status
   * @param {string} message - Optional custom message
   * @returns {Promise<boolean>} Success status
   */
  static async sendOrderStatusUpdate(order, customer, newStatus, customMessage = null) {
    try {
      if (!customer.phoneNumber) {
        logger.warn(`Customer ${customer._id} has no phone number for status update SMS`);
        return false;
      }

      const orderNumber = order.orderNumber || order._id.toString().slice(-8);
      
      const message = customMessage || this.formatStatusUpdateMessage({
        orderNumber,
        newStatus,
        customerName: customer.firstName || 'Customer'
      });

      const smsSent = await sendSMS(customer.phoneNumber, message, {
        senderId: process.env.SMS_SENDER_ID || 'OrderAlert',
        smsType: 'Transactional'
      });

      if (smsSent) {
        logger.info(`Order status update SMS sent to ${customer.phoneNumber} for order ${orderNumber}`);
      } else {
        logger.warn(`Failed to send order status update SMS to ${customer.phoneNumber} for order ${orderNumber}`);
      }

      return smsSent;

    } catch (error) {
      logger.error(`Unexpected error sending order status update SMS: ${error.message}`);
      return false;
    }
  }

  /**
   * Send order cancellation SMS to customer
   * @param {object} order - Order object
   * @param {object} customer - Customer object
   * @param {string} reason - Cancellation reason
   * @returns {Promise<boolean>} Success status
   */
  static async sendOrderCancellation(order, customer, reason = 'No reason provided') {
    try {
      if (!customer.phoneNumber) {
        logger.warn(`Customer ${customer._id} has no phone number for cancellation SMS`);
        return false;
      }

      const orderNumber = order.orderNumber || order._id.toString().slice(-8);
      
      const message = this.formatCancellationMessage({
        orderNumber,
        customerName: customer.firstName || 'Customer',
        reason
      });

      const smsSent = await sendSMS(customer.phoneNumber, message, {
        senderId: process.env.SMS_SENDER_ID || 'OrderAlert',
        smsType: 'Transactional'
      });

      if (smsSent) {
        logger.info(`Order cancellation SMS sent to ${customer.phoneNumber} for order ${orderNumber}`);
      } else {
        logger.warn(`Failed to send order cancellation SMS to ${customer.phoneNumber} for order ${orderNumber}`);
      }

      return smsSent;

    } catch (error) {
      logger.error(`Unexpected error sending order cancellation SMS: ${error.message}`);
      return false;
    }
  }

  /**
   * Format order confirmation message
   * @param {object} data - Order data
   * @returns {string} Formatted SMS message
   */
  static formatOrderConfirmationMessage({ orderNumber, totalAmount, itemCount, customerName, status }) {
    return `Hi ${customerName}! Your order #${orderNumber} has been confirmed. Total: ${totalAmount} (${itemCount} items). Status: ${status}. Thank you for choosing us!`;
  }

  /**
   * Format status update message
   * @param {object} data - Status update data
   * @returns {string} Formatted SMS message
   */
  static formatStatusUpdateMessage({ orderNumber, newStatus, customerName }) {
    const statusMessages = {
      'pending': 'is being processed',
      'confirmed': 'has been confirmed',
      'processing': 'is being prepared',
      'shipped': 'has been shipped',
      'delivered': 'has been delivered',
      'cancelled': 'has been cancelled'
    };

    const statusText = statusMessages[newStatus.toLowerCase()] || `status is now ${newStatus}`;
    
    return `Hi ${customerName}! Your order #${orderNumber} ${statusText}. Track your order for updates.`;
  }

  /**
   * Format cancellation message
   * @param {object} data - Cancellation data
   * @returns {string} Formatted SMS message
   */
  static formatCancellationMessage({ orderNumber, customerName, reason }) {
    return `Hi ${customerName}! Your order #${orderNumber} has been cancelled. Reason: ${reason}. Refund will be processed within 3-5 business days.`;
  }

  /**
   * Send admin notification for new order
   * @param {object} order - Order object
   * @param {object} customer - Customer object
   * @returns {Promise<boolean>} Success status
   */
  static async sendAdminNotification(order, customer) {
    try {
      const adminPhone = process.env.ADMIN_PHONE_NUMBER;
      
      if (!adminPhone) {
        logger.warn('Admin phone number not configured for order notifications');
        return false;
      }

      const orderNumber = order.orderNumber || order._id.toString().slice(-8);
      const totalAmount = order.totalAmount ? `$${order.totalAmount.toFixed(2)}` : 'TBD';
      
      const message = `NEW ORDER ALERT! Order #${orderNumber} from ${customer.firstName} ${customer.lastName} (${customer.email}). Total: ${totalAmount}. Check admin panel for details.`;

      const smsSent = await sendSMS(adminPhone, message, {
        senderId: process.env.SMS_SENDER_ID || 'OrderAlert',
        smsType: 'Transactional'
      });

      if (smsSent) {
        logger.info(`Admin notification SMS sent for order ${orderNumber}`);
      } else {
        logger.warn(`Failed to send admin notification SMS for order ${orderNumber}`);
      }

      return smsSent;

    } catch (error) {
      logger.error(`Unexpected error sending admin notification SMS: ${error.message}`);
      return false;
    }
  }
}

module.exports = OrderNotificationService;
