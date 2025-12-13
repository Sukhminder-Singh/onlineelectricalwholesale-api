// Load environment variables
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : 'config.env';
require('dotenv').config({ path: require('path').resolve(__dirname, '..', envFile) });

const AuthService = require('../services/AuthService');

async function testRegistrationEmail() {
  console.log('🧪 Testing Registration Email Flow...\n');
  
  // Check configuration
  console.log('📋 Configuration Check:');
  console.log('- AWS_REGION:', process.env.AWS_REGION || 'NOT SET');
  console.log('- AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET');
  console.log('- AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET');
  console.log('- AWS_SES_FROM_EMAIL:', process.env.AWS_SES_FROM_EMAIL || 'NOT SET');
  console.log('');

  // Test user data
  const testUserData = {
    fullName: 'Test User',
    email: process.argv[2] || 'sukhmindersingh1566@gmail.com',
    password: 'Test123',
    phoneNumber: '+1234567890'
  };

  console.log(`📧 Testing registration for: ${testUserData.email}`);
  console.log('');

  try {
    console.log('⏳ Registering user...');
    const user = await AuthService.registerUser(testUserData);
    
    console.log('✅ User registered successfully!');
    console.log(`   User ID: ${user._id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Email Verified: ${user.emailVerified}`);
    console.log(`   OTP Code: ${user.emailOtpCode}`);
    console.log(`   OTP Expires: ${new Date(user.emailOtpExpires).toLocaleString()}`);
    console.log('');
    console.log('📧 Check your email inbox for the OTP code!');
    console.log(`   OTP: ${user.emailOtpCode}`);
    console.log('');
    console.log('💡 To verify the email, use:');
    console.log(`   curl -X POST http://localhost:5000/api/auth/verify-email \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"email":"${testUserData.email}","otp":"${user.emailOtpCode}"}'`);
    
  } catch (error) {
    console.error('❌ Registration failed:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }

  process.exit(0);
}

testRegistrationEmail();

