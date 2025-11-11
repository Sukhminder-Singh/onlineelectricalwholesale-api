// Load environment variables
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : 'config.env';
require('dotenv').config({ path: require('path').resolve(__dirname, '..', envFile) });

const { sendSMS } = require('../utils/sms');
const { logger } = require('../middleware/logger');

/**
 * Test SMS functionality
 */
async function testSMS() {
  console.log('🧪 Testing SMS functionality...\n');

  // Check environment variables
  console.log('📋 Environment Check:');
  console.log(`AWS_REGION: ${process.env.AWS_REGION || 'NOT SET'}`);
  console.log(`AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET'}`);
  console.log(`AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET'}`);
  console.log(`SMS_SENDER_ID: ${process.env.SMS_SENDER_ID || 'NOT SET'}`);
  console.log(`ADMIN_PHONE_NUMBER: ${process.env.ADMIN_PHONE_NUMBER || 'NOT SET'}\n`);

  // Test with admin phone number if available
  const testPhone = process.env.ADMIN_PHONE_NUMBER || '+1234567890';
  const testMessage = 'Test SMS from Online Wholesale API - SMS functionality is working!';

  console.log(`📱 Testing SMS to: ${testPhone}`);
  console.log(`📝 Message: ${testMessage}\n`);

  try {
    const result = await sendSMS(testPhone, testMessage, {
      senderId: process.env.SMS_SENDER_ID || 'TestAlert',
      smsType: 'Transactional'
    });

    if (result) {
      console.log('✅ SMS test successful!');
    } else {
      console.log('❌ SMS test failed - check logs for details');
    }
  } catch (error) {
    console.log(`❌ SMS test error: ${error.message}`);
  }

  console.log('\n📊 SMS Test Complete');
}

// Run the test
if (require.main === module) {
  testSMS().catch(console.error);
}

module.exports = { testSMS };