const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { logger } = require('../middleware/logger');

// Initialize SNS client with environment configuration
// Ensure these env vars are set: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
const snsClient = new SNSClient({
  region: process.env.AWS_REGION || process.env.AWS_SNS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

// Check if SMS is enabled and properly configured
const isSMSEnabled = () => {
  return !!(
    process.env.AWS_ACCESS_KEY_ID && 
    process.env.AWS_SECRET_ACCESS_KEY && 
    process.env.AWS_REGION
  );
};

/**
 * Send an SMS message using AWS SNS
 * @param {string} phoneNumber E.164 format, e.g., "+14155552671"
 * @param {string} message SMS message body
 * @param {object} [options]
 * @returns {Promise<boolean>} Success status
 */
async function sendSMS(phoneNumber, message, options = {}) {
  try {
    // Check if SMS is enabled
    if (!isSMSEnabled()) {
      logger.warn('SMS is not enabled - AWS credentials not configured');
      return false;
    }

    // Validate phone number
    if (!phoneNumber || !/^\+?[1-9]\d{7,14}$/.test(phoneNumber)) {
      logger.error(`Invalid phone number format: ${phoneNumber}`);
      return false;
    }

    // Validate message
    if (!message || message.trim().length === 0) {
      logger.error('SMS message is empty or invalid');
      return false;
    }

    const params = {
      PhoneNumber: phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`,
      Message: message
    };

    const command = new PublishCommand(params);
    await snsClient.send(command);
    logger.info(`SMS sent successfully to ${phoneNumber}`);
    return true;

  } catch (error) {
    // Handle specific AWS SNS errors
    if (error.code === 'AccessDenied' || error.message.includes('not authorized')) {
      logger.error(`SMS access denied - IAM user lacks SNS:Publish permission: ${error.message}`);
    } else if (error.code === 'InvalidParameter') {
      logger.error(`SMS invalid parameter: ${error.message}`);
    } else if (error.code === 'Throttling') {
      logger.error(`SMS throttled - too many requests: ${error.message}`);
    } else {
      logger.error(`SMS send failed: ${error.message}`);
    }
    
    return false;
  }
}

module.exports = { sendSMS }; 
