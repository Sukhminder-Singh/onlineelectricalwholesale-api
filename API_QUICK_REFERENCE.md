# Email Verification API - Quick Reference

## 🚀 Base URL
```
http://localhost:5000/api/auth
```

## 📋 Endpoints

### 1. Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "phoneNumber": "+1234567890"
}
```
**Response:** User created + OTP email sent automatically

---

### 2. Verify Email
```http
POST /api/auth/verify-email
Content-Type: application/json

{
  "email": "john@example.com",
  "otp": "123456"
}
```
**Response:** Email verified successfully

---

### 3. Resend OTP
```http
POST /api/auth/resend-email-otp
Content-Type: application/json

{
  "email": "john@example.com"
}
```
**Response:** New OTP sent to email

---

## 🧪 Quick Test Commands

### Using cURL
```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test User","email":"test@example.com","password":"Test123","phoneNumber":"+1234567890"}'

# Verify (after checking email for OTP)
curl -X POST http://localhost:5000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"123456"}'

# Resend OTP
curl -X POST http://localhost:5000/api/auth/resend-email-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### Using Test Script
```bash
# Run registration test
npm run test-api

# Test with OTP
npm run test-api -- --otp=123456

# Resend OTP first
npm run test-api -- --resend
```

### Using HTTP File (VS Code REST Client)
Open `API_EXAMPLES.http` and click "Send Request"

---

## 📝 Response Format

### Success
```json
{
  "status": "success",
  "message": "Operation successful",
  "data": { ... }
}
```

### Error
```json
{
  "status": "error",
  "message": "Error message",
  "error": "ErrorType"
}
```

---

## ⚙️ OTP Details
- **Format:** 6-digit number
- **Expires:** 10 minutes
- **Max Attempts:** 5
- **Delivery:** AWS SES Email

---

## 📚 Full Documentation
See `API_DOCUMENTATION.md` for complete details with examples in:
- JavaScript/Fetch
- React/Next.js
- Python
- cURL
- Postman

