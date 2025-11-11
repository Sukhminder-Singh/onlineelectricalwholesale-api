#!/usr/bin/env node

/**
 * CORS Configuration Test Script
 * This script helps test your CORS configuration before deploying to production
 */

const http = require('http');
const https = require('https');
const url = require('url');

// Load environment variables
const path = require('path');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : 'config.env';
require('dotenv').config({ path: path.resolve(__dirname, envFile) });

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

// Test configurations
const testConfigs = [
  {
    name: 'Production API Domain',
    origin: 'https://api.onelineelectricalwholesale.com.au',
    expected: 'allowed'
  },
  {
    name: 'Production Website',
    origin: 'https://onelineelectricalwholesale.com.au',
    expected: 'allowed'
  },
  {
    name: 'Production Website with WWW',
    origin: 'https://www.onelineelectricalwholesale.com.au',
    expected: 'allowed'
  },
  {
    name: 'Local Development',
    origin: 'http://localhost:3000',
    expected: 'allowed'
  },
  {
    name: 'Unauthorized Domain',
    origin: 'https://malicious-site.com',
    expected: 'blocked'
  },
  {
    name: 'No Origin Header',
    origin: null,
    expected: 'allowed' // Should be allowed for API calls without origin
  }
];

function makeCORSRequest(testConfig) {
  return new Promise((resolve, reject) => {
    const parsedUrl = url.parse(`${API_BASE_URL}/health`);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.path,
      method: 'OPTIONS', // Use OPTIONS to test preflight
      headers: {
        'Origin': testConfig.origin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    };

    console.log(`\n🧪 Testing: ${testConfig.name}`);
    console.log(`   Origin: ${testConfig.origin || 'None'}`);
    console.log(`   Expected: ${testConfig.expected}`);

    const req = (parsedUrl.protocol === 'https:' ? https : http).request(options, (res) => {
      const allowedOrigin = res.headers['access-control-allow-origin'];
      const allowedMethods = res.headers['access-control-allow-methods'];
      const allowedHeaders = res.headers['access-control-allow-headers'];
      const allowCredentials = res.headers['access-control-allow-credentials'];

      console.log(`   Status Code: ${res.statusCode}`);
      console.log(`   Allowed Origin: ${allowedOrigin || 'None'}`);
      console.log(`   Allowed Methods: ${allowedMethods || 'None'}`);
      console.log(`   Allowed Headers: ${allowedHeaders || 'None'}`);
      console.log(`   Allow Credentials: ${allowCredentials || 'None'}`);

      const result = {
        testName: testConfig.name,
        origin: testConfig.origin,
        statusCode: res.statusCode,
        allowedOrigin: allowedOrigin,
        allowedMethods: allowedMethods,
        allowedHeaders: allowedHeaders,
        allowCredentials: allowCredentials,
        passed: false
      };

      // Determine if test passed
      if (testConfig.expected === 'allowed') {
        result.passed = res.statusCode === 200 && (allowedOrigin === testConfig.origin || allowedOrigin === '*');
      } else {
        result.passed = res.statusCode === 403 || !allowedOrigin;
      }

      console.log(`   Result: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
      resolve(result);
    });

    req.on('error', (error) => {
      console.error(`   ❌ Request failed: ${error.message}`);
      reject(error);
    });

    req.end();
  });
}

async function runTests() {
  console.log('🚀 Starting CORS Configuration Tests');
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Allowed Origins: ${process.env.ALLOWED_ORIGINS || 'Not set'}`);

  const results = [];
  
  for (const testConfig of testConfigs) {
    try {
      const result = await makeCORSRequest(testConfig);
      results.push(result);
    } catch (error) {
      console.error(`Test failed: ${error.message}`);
      results.push({
        testName: testConfig.name,
        origin: testConfig.origin,
        error: error.message,
        passed: false
      });
    }
  }

  // Summary
  console.log('\n📊 Test Summary:');
  console.log('==================');
  
  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;
  
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

  // Detailed results
  console.log('\n📋 Detailed Results:');
  results.forEach(result => {
    console.log(`${result.passed ? '✅' : '❌'} ${result.testName}: ${result.passed ? 'PASSED' : 'FAILED'}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  // Recommendations
  console.log('\n💡 Recommendations:');
  if (passedTests < totalTests) {
    console.log('   - Check your ALLOWED_ORIGINS environment variable');
    console.log('   - Ensure origins are comma-separated without spaces');
    console.log('   - Verify your API server is running and accessible');
    console.log('   - Check server logs for CORS-related errors');
  } else {
    console.log('   ✅ All CORS tests passed! Your configuration looks good.');
  }
}

// Run tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testConfigs };