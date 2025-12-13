// Load environment variables
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : 'config.env';
require('dotenv').config({ path: require('path').resolve(__dirname, '..', envFile) });

const { sendOtpEmail, sendEmail } = require('../utils/email');

async function testEmail() {
  console.log('🧪 Testing AWS SES Email Functionality...\n');
  
  // Check configuration
  console.log('📋 Configuration Check:');
  console.log('- AWS_REGION:', process.env.AWS_REGION || 'NOT SET');
  console.log('- AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET');
  console.log('- AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET');
  console.log('- AWS_SES_FROM_EMAIL:', process.env.AWS_SES_FROM_EMAIL || 'NOT SET');
  console.log('');

  // Test email (replace with your test email - must be verified in SES Sandbox)
  const testEmail = process.argv[2] || 'test@example.com';
  const testOtp = '123456';
  const testName = 'Test User';

  if (!process.env.AWS_SES_FROM_EMAIL) {
    console.error('❌ AWS_SES_FROM_EMAIL is not set in config.env');
    console.log('Please add AWS_SES_FROM_EMAIL=noreply@yourdomain.com to your config.env file');
    process.exit(1);
  }

  if (testEmail === 'test@example.com') {
    console.log('⚠️  Using default test email. Please provide a test email as argument:');
    console.log('   node scripts/testEmail.js your-email@example.com');
    console.log('');
    console.log('Note: In AWS SES Sandbox mode, you can only send to verified email addresses.');
    console.log('');
  }

  console.log(`📧 Sending test OTP email to: ${testEmail}`);
  console.log('');

  try {
    const result = await sendOtpEmail(testEmail, testOtp, testName);
    
    if (result) {
      console.log('✅ Email sent successfully!');
      console.log(`   Check your inbox at ${testEmail}`);
      console.log(`   OTP Code: ${testOtp}`);
    } else {
      console.log('❌ Failed to send email');
      console.log('   Check your AWS SES configuration and permissions');
      console.log('   Make sure:');
      console.log('   1. Your sender email is verified in AWS SES');
      console.log('   2. Your IAM user has ses:SendEmail permission');
      console.log('   3. If in Sandbox mode, recipient email must be verified');
    }
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    console.error('   Stack:', error.stack);
  }

  process.exit(0);
}

testEmail();

