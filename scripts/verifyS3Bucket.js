/**
 * Script to verify S3 bucket configuration and region
 * Run with: node scripts/verifyS3Bucket.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', 'config.env') });
const { S3Client, GetBucketLocationCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');

async function verifyS3Bucket() {
  console.log('🔍 Verifying S3 Bucket Configuration...\n');

  // Check environment variables
  const requiredVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'AWS_BUCKET_NAME'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    process.exit(1);
  }

  console.log('✅ All required environment variables are set');
  console.log(`   Bucket: ${process.env.AWS_BUCKET_NAME}`);
  console.log(`   Configured Region: ${process.env.AWS_REGION}\n`);

  // Create S3 client
  const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  try {
    // First, check if bucket exists and is accessible
    console.log('📦 Checking bucket accessibility...');
    await s3Client.send(new HeadBucketCommand({
      Bucket: process.env.AWS_BUCKET_NAME
    }));
    console.log('✅ Bucket is accessible\n');

    // Get the actual bucket region
    console.log('🌍 Detecting bucket region...');
    const locationResponse = await s3Client.send(new GetBucketLocationCommand({
      Bucket: process.env.AWS_BUCKET_NAME
    }));

    // Note: GetBucketLocationCommand returns null for us-east-1 (default region)
    const actualRegion = locationResponse.LocationConstraint || 'us-east-1';
    const configuredRegion = process.env.AWS_REGION;

    console.log(`   Actual Bucket Region: ${actualRegion}`);
    console.log(`   Configured Region: ${configuredRegion}`);

    if (actualRegion === configuredRegion) {
      console.log('\n✅ Region matches! Your configuration is correct.');
    } else {
      console.log('\n⚠️  WARNING: Region mismatch detected!');
      console.log(`   Your bucket is in: ${actualRegion}`);
      console.log(`   But your config specifies: ${configuredRegion}`);
      console.log(`\n   Please update AWS_REGION in config.env to: ${actualRegion}`);
    }

  } catch (error) {
    console.error('\n❌ Error verifying bucket:');
    
    if (error.name === 'NotFound' || error.message.includes('NoSuchBucket')) {
      console.error('   Bucket not found. Please verify AWS_BUCKET_NAME is correct.');
    } else if (error.name === 'Forbidden' || error.message.includes('Access Denied')) {
      console.error('   Access denied. Please check your AWS credentials and bucket permissions.');
    } else if (error.message && error.message.includes('endpoint')) {
      console.error('   Endpoint error detected. This usually means:');
      console.error('   1. The bucket is in a different region than configured');
      console.error('   2. The bucket name is incorrect');
      console.error('\n   Try running this script with different regions to find the correct one.');
    } else {
      console.error(`   ${error.name}: ${error.message}`);
    }
    
    process.exit(1);
  }
}

// Run the verification
verifyS3Bucket().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});

