# Debug Email Not Sending Issue

## Issue
Email is not being sent when registration API is called.

## Debugging Steps

### 1. Check Environment Variables
Make sure these are set in `config.env`:
```env
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=ap-southeast-2
AWS_SES_FROM_EMAIL=sukhmindersingh1566@gmail.com
```

### 2. Check Server Logs
When you call the registration API, check the server logs for:
- "Attempting to send OTP email" - confirms email function is called
- "OTP email sent successfully" - confirms email was sent
- "Failed to send OTP email" - shows what went wrong
- "Email is not enabled" - shows missing configuration

### 3. Test Email Directly
```bash
npm run test-email sukhmindersingh1566@gmail.com
```

### 4. Check AWS SES Status
1. Go to AWS SES Console
2. Check if sender email is verified
3. Check if account is in Sandbox mode (can only send to verified emails)
4. Check IAM permissions for SES

### 5. Common Issues

#### Issue: Environment variables not loaded
**Solution:** Make sure server is restarted after changing config.env

#### Issue: Email verified but still not sending
**Solution:** Check if recipient email is also verified (Sandbox mode requirement)

#### Issue: IAM permissions missing
**Solution:** Add `ses:SendEmail` permission to IAM user

#### Issue: Email going to spam
**Solution:** See FIX_SPAM_ISSUES.md

### 6. Enable Debug Logging
The code now logs:
- Email attempt with OTP code
- Configuration status
- Success/failure with details

Check your server logs when calling the API.

