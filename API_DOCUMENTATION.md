# Email Verification API Documentation

## Base URL
```
http://localhost:5000/api/auth
```

## Authentication Endpoints

### 1. Register User (with Email OTP)

Registers a new user and automatically sends an OTP verification email.

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "fullName": "John Doe",
  "email": "john.doe@example.com",
  "password": "SecurePass123",
  "phoneNumber": "+1234567890"
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "User registered successfully. Please check your email for OTP verification.",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "username": "johndoe_123456",
      "email": "john.doe@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "emailVerified": false,
      "role": "user",
      "isActive": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "email": "john.doe@example.com",
    "password": "SecurePass123",
    "phoneNumber": "+1234567890"
  }'
```

**JavaScript/Fetch Example:**
```javascript
const response = await fetch('http://localhost:5000/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    fullName: 'John Doe',
    email: 'john.doe@example.com',
    password: 'SecurePass123',
    phoneNumber: '+1234567890'
  })
});

const data = await response.json();
console.log(data);
```

---

### 2. Verify Email with OTP

Verifies the user's email address using the OTP code sent to their email.

**Endpoint:** `POST /api/auth/verify-email`

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "otp": "123456"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Email verified successfully",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "john.doe@example.com",
      "emailVerified": true
    }
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "status": "error",
  "message": "Invalid OTP code",
  "error": "AuthenticationError"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "otp": "123456"
  }'
```

**JavaScript/Fetch Example:**
```javascript
const response = await fetch('http://localhost:5000/api/auth/verify-email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'john.doe@example.com',
    otp: '123456'
  })
});

const data = await response.json();
console.log(data);
```

---

### 3. Resend Email OTP

Resends the OTP verification code to the user's email address.

**Endpoint:** `POST /api/auth/resend-email-otp`

**Request Body:**
```json
{
  "email": "john.doe@example.com"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "OTP sent to your email address."
}
```

**Error Response (400 Bad Request):**
```json
{
  "status": "error",
  "message": "Email is already verified",
  "error": "ValidationError"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/auth/resend-email-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com"
  }'
```

**JavaScript/Fetch Example:**
```javascript
const response = await fetch('http://localhost:5000/api/auth/resend-email-otp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'john.doe@example.com'
  })
});

const data = await response.json();
console.log(data);
```

---

## Complete Registration Flow Example

### Step 1: Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "email": "john.doe@example.com",
    "password": "SecurePass123",
    "phoneNumber": "+1234567890"
  }'
```

**Response:** User created, OTP email sent automatically

### Step 2: Check Email
- User receives email with 6-digit OTP code
- OTP expires in 10 minutes

### Step 3: Verify Email
```bash
curl -X POST http://localhost:5000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "otp": "123456"
  }'
```

**Response:** Email verified successfully

### Step 4: (Optional) Resend OTP if Needed
```bash
curl -X POST http://localhost:5000/api/auth/resend-email-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com"
  }'
```

---

## Error Responses

### Validation Error (400)
```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ]
}
```

### Authentication Error (401)
```json
{
  "status": "error",
  "message": "Invalid OTP code",
  "error": "AuthenticationError"
}
```

### Conflict Error (409)
```json
{
  "status": "error",
  "message": "Email already registered",
  "error": "ConflictError"
}
```

### Not Found Error (404)
```json
{
  "status": "error",
  "message": "User not found",
  "error": "NotFoundError"
}
```

---

## Rate Limiting

All endpoints are protected by rate limiting:
- **Registration:** Limited to prevent abuse
- **Email Verification:** Limited to prevent brute force attacks
- **Resend OTP:** Limited to prevent spam

---

## OTP Details

- **Format:** 6-digit numeric code
- **Expiration:** 10 minutes
- **Max Attempts:** 5 attempts before requiring new OTP
- **Delivery:** Sent via AWS SES email

---

## Testing with Postman

### Import Collection
1. Create a new collection in Postman
2. Add the three endpoints above
3. Set base URL: `http://localhost:5000/api/auth`

### Environment Variables
Create a Postman environment with:
- `base_url`: `http://localhost:5000/api/auth`
- `test_email`: `your-test-email@example.com`
- `test_otp`: (will be received via email)

---

## React/Next.js Example

```javascript
// Register user
const registerUser = async (userData) => {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    
    const data = await response.json();
    
    if (data.status === 'success') {
      // Show OTP input form
      setShowOtpForm(true);
      setUserEmail(userData.email);
    }
  } catch (error) {
    console.error('Registration failed:', error);
  }
};

// Verify email
const verifyEmail = async (email, otp) => {
  try {
    const response = await fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });
    
    const data = await response.json();
    
    if (data.status === 'success') {
      // Email verified, redirect to dashboard
      router.push('/dashboard');
    }
  } catch (error) {
    console.error('Verification failed:', error);
  }
};

// Resend OTP
const resendOtp = async (email) => {
  try {
    const response = await fetch('/api/auth/resend-email-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    const data = await response.json();
    alert(data.message);
  } catch (error) {
    console.error('Resend failed:', error);
  }
};
```

---

## Python Example

```python
import requests

BASE_URL = "http://localhost:5000/api/auth"

# Register user
def register_user(full_name, email, password, phone_number):
    response = requests.post(
        f"{BASE_URL}/register",
        json={
            "fullName": full_name,
            "email": email,
            "password": password,
            "phoneNumber": phone_number
        }
    )
    return response.json()

# Verify email
def verify_email(email, otp):
    response = requests.post(
        f"{BASE_URL}/verify-email",
        json={
            "email": email,
            "otp": otp
        }
    )
    return response.json()

# Resend OTP
def resend_otp(email):
    response = requests.post(
        f"{BASE_URL}/resend-email-otp",
        json={"email": email}
    )
    return response.json()

# Usage
user_data = register_user(
    "John Doe",
    "john.doe@example.com",
    "SecurePass123",
    "+1234567890"
)
print(user_data)

# User checks email and enters OTP
otp = input("Enter OTP from email: ")
result = verify_email("john.doe@example.com", otp)
print(result)
```

---

## Notes

1. **Email Delivery:** OTP emails are sent via AWS SES. Make sure your sender email is verified.
2. **OTP Expiration:** OTP codes expire after 10 minutes.
3. **Rate Limiting:** Be mindful of rate limits when testing.
4. **Production:** Update base URL to your production API URL.
5. **Security:** Always use HTTPS in production.

