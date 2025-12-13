/**
 * API Test Script for Email Verification
 * Run with: node test-api.js
 */

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api/auth';

// Test user data
const testUser = {
  fullName: 'Test User',
  email: 'test@example.com', // Change to your test email
  password: 'Test123',
  phoneNumber: '+1234567890'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function makeRequest(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();

    return {
      status: response.status,
      ok: response.ok,
      data
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message
    };
  }
}

async function testRegistration() {
  log('\n📝 Testing User Registration...', 'blue');
  
  const result = await makeRequest('/register', 'POST', testUser);
  
  if (result.ok) {
    log('✅ Registration successful!', 'green');
    log(`   User ID: ${result.data.data?.user?.id}`, 'green');
    log(`   Email: ${result.data.data?.user?.email}`, 'green');
    log(`   Email Verified: ${result.data.data?.user?.emailVerified}`, 'green');
    log(`   Message: ${result.data.message}`, 'green');
    log('\n📧 Check your email for OTP code!', 'yellow');
    return true;
  } else {
    log('❌ Registration failed!', 'red');
    log(`   Status: ${result.status}`, 'red');
    log(`   Error: ${result.data?.message || result.error}`, 'red');
    return false;
  }
}

async function testVerifyEmail(otp) {
  log('\n🔐 Testing Email Verification...', 'blue');
  
  if (!otp) {
    log('⚠️  No OTP provided. Please enter OTP from email:', 'yellow');
    return false;
  }

  const result = await makeRequest('/verify-email', 'POST', {
    email: testUser.email,
    otp: otp
  });

  if (result.ok) {
    log('✅ Email verification successful!', 'green');
    log(`   Email Verified: ${result.data.data?.user?.emailVerified}`, 'green');
    return true;
  } else {
    log('❌ Email verification failed!', 'red');
    log(`   Status: ${result.status}`, 'red');
    log(`   Error: ${result.data?.message || result.error}`, 'red');
    return false;
  }
}

async function testResendOtp() {
  log('\n📨 Testing Resend OTP...', 'blue');
  
  const result = await makeRequest('/resend-email-otp', 'POST', {
    email: testUser.email
  });

  if (result.ok) {
    log('✅ OTP resent successfully!', 'green');
    log(`   Message: ${result.data.message}`, 'green');
    log('\n📧 Check your email for new OTP code!', 'yellow');
    return true;
  } else {
    log('❌ Resend OTP failed!', 'red');
    log(`   Status: ${result.status}`, 'red');
    log(`   Error: ${result.data?.message || result.error}`, 'red');
    return false;
  }
}

// Main test function
async function runTests() {
  log('🚀 Starting API Tests...', 'blue');
  log(`📍 Base URL: ${BASE_URL}`, 'blue');
  log(`📧 Test Email: ${testUser.email}`, 'blue');

  // Check if fetch is available (Node.js 18+)
  if (typeof fetch === 'undefined') {
    log('\n❌ Error: fetch is not available. Please use Node.js 18+ or install node-fetch', 'red');
    process.exit(1);
  }

  // Test 1: Registration
  const registered = await testRegistration();
  
  if (!registered) {
    log('\n⚠️  Registration failed. Cannot continue with other tests.', 'yellow');
    process.exit(1);
  }

  // Wait a bit for email to arrive
  log('\n⏳ Waiting 3 seconds for email to arrive...', 'yellow');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Test 2: Resend OTP (optional)
  const args = process.argv.slice(2);
  if (args.includes('--resend')) {
    await testResendOtp();
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Test 3: Verify Email
  const otp = args.find(arg => arg.startsWith('--otp='))?.split('=')[1];
  if (otp) {
    await testVerifyEmail(otp);
  } else {
    log('\n💡 To test email verification, run:', 'yellow');
    log(`   node test-api.js --otp=123456`, 'yellow');
  }

  log('\n✨ Tests completed!', 'blue');
}

// Run tests
runTests().catch(error => {
  log(`\n❌ Test error: ${error.message}`, 'red');
  process.exit(1);
});

