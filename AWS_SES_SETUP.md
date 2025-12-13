# AWS SES Setup Guide

## Current Status
✅ Configuration added to `config.env`
✅ Email utility created
✅ API endpoints ready
❌ IAM permissions need to be updated

## Required AWS Setup Steps

### 1. Add IAM Permission for SES

Your IAM user `AdminRole-API` needs the `ses:SendEmail` permission.

**Option A: Add via AWS Console**
1. Go to AWS IAM Console → Users → `AdminRole-API`
2. Click "Add permissions" → "Attach policies directly"
3. Search for and attach: `AmazonSESFullAccess` (or create a custom policy with just `ses:SendEmail`)

**Option B: Create Custom Policy (Recommended for Security)**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
```

### 2. Verify Sender Email in AWS SES

1. Go to AWS SES Console → Verified identities
2. Click "Create identity"
3. Choose "Email address" and enter: `  `
4. Check your email and click the verification link
5. Wait for status to show "Verified"

### 3. Verify Recipient Email (If in Sandbox Mode)

If your AWS SES account is in **Sandbox mode**:
- You can only send emails to verified email addresses
- Go to SES Console → Verified identities → Create identity
- Verify any email addresses you want to test with

### 4. Request Production Access (Optional)

For production, you need to:
1. Go to SES Console → Account dashboard
2. Click "Request production access"
3. Fill out the form explaining your use case
4. Wait for AWS approval (usually 24-48 hours)

## Testing

### Test Email Utility Directly
```bash
node scripts/testEmail.js your-verified-email@example.com
```

### Test Registration API
```bash
# Register a new user (will send OTP email)
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "email": "test@example.com",
    "password": "Test123",
    "phoneNumber": "+1234567890"
  }'
```

### Test Email Verification
```bash
# Verify email with OTP (check your email for the OTP)
curl -X POST http://localhost:5000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otp": "123456"
  }'
```

### Resend OTP
```bash
curl -X POST http://localhost:5000/api/auth/resend-email-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

## Current Configuration

Your `config.env` now includes:
```env
AWS_REGION=ap-southeast-2
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
AWS_SES_FROM_EMAIL=noreply@onlineelectricalwholesale.com.au
```

## Next Steps

1. ✅ Add IAM permission for SES (see above)
2. ✅ Verify sender email in AWS SES console
3. ✅ Test with verified recipient email
4. ✅ Request production access if needed

