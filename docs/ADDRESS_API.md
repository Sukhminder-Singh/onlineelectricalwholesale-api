# Address API Documentation

## Overview
The Address API allows users to manage multiple addresses for their account. Users can add, update, delete, and set default addresses. All address data is included in the login API response.

## Base URL
```
/api/addresses
```

## Authentication
All endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Address Model (Minimal fields supported)
```javascript
{
  _id: ObjectId,
  user: ObjectId,
  // Optional metadata
  addressType?: 'home' | 'work' | 'billing' | 'shipping' | 'other',
  isDefault?: boolean,
  label?: string,
  // Primary address lines (aliases supported)
  street (alias: line1): string,
  street2? (alias: line2): string,
  // Location
  city: string,
  state?: string,
  postalCode?: string,
  country?: string,
  // Optional extras
  contactName?: string,
  contactPhone?: string,
  coordinates?: { latitude?: number, longitude?: number },
  instructions?: string,
  isActive: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## API Endpoints

### 1. Get All Addresses
**GET** `/api/addresses`

Get all addresses for the authenticated user.

**Query Parameters:**
- `addressType` (optional): Filter by address type
- `isDefault` (optional): Filter by default status (true/false)

**Response:**
```json
{
  "success": true,
  "data": {
    "addresses": [...],
    "count": 3
  },
  "message": "Addresses retrieved successfully"
}
```

### 2. Get Address by ID
**GET** `/api/addresses/:addressId`

Get a specific address by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "user": "...",
    "addressType": "home",
    "isDefault": true,
    "contactName": "John Doe",
    "street": "123 Main St",
    "city": "Sydney",
    "state": "NSW",
    "postalCode": "2000",
    "country": "Australia",
    "fullAddress": "123 Main St, Sydney, NSW, 2000, Australia",
    "shortAddress": "Sydney, NSW, Australia"
  },
  "message": "Address retrieved successfully"
}
```

### 3. Get Default Address
**GET** `/api/addresses/default`

Get the user's default address.

**Response:**
```json
{
  "success": true,
  "data": {
    // Address object
  },
  "message": "Default address retrieved successfully"
}
```

### 4. Get Addresses by Type
**GET** `/api/addresses/type/:addressType`

Get addresses filtered by type.

**Path Parameters:**
- `addressType`: One of 'home', 'work', 'billing', 'shipping', 'other'

**Response:**
```json
{
  "success": true,
  "data": {
    "addresses": [...],
    "count": 2,
    "addressType": "home"
  },
  "message": "home addresses retrieved successfully"
}
```

### 5. Create Address (Minimal Payload)
**POST** `/api/addresses`

Create a new address.

**Request Body (only required/minimal fields):**
```json
{
  "id": "1760956430393",       // optional client id, server generates _id
  "label": "Home",             // optional
  "isDefault": false,           // optional
  "customerId": "<mongoId>",  // optional; admins only, address is created for this customer
  "line1": "Aashiyana residency 34",
  "line2": "",                 // optional
  "city": "jaipur",
  "state": "New York",         // optional
  "postalCode": "302025"       // optional
}
```

Notes:
- You may send either `street`/`street2` or `line1`/`line2`. The API maps `line1 -> street` and `line2 -> street2`.
- `country`, `contactName`, and `contactPhone` are optional.
- `customerId` is only honored when the authenticated user is an admin; otherwise, the address is created for the authenticated user.

**Response:**
```json
{
  "success": true,
  "data": {
    // Created address object
  },
  "message": "Address created successfully"
}
```

### 6. Update Address
**PUT** `/api/addresses/:addressId`

Update an existing address.

**Request Body:** Same as create, but all fields are optional. `line1/line2` are accepted and mapped.

**Response:**
```json
{
  "success": true,
  "data": {
    // Updated address object
  },
  "message": "Address updated successfully"
}
```

### 7. Set Default Address
**PATCH** `/api/addresses/:addressId/set-default`

Set an address as the default address for the user.

**Response:**
```json
{
  "success": true,
  "data": {
    // Updated address object
  },
  "message": "Default address updated successfully"
}
```

### 8. Delete Address
**DELETE** `/api/addresses/:addressId`

Soft delete an address (sets isActive to false).

**Response:**
```json
{
  "success": true,
  "message": "Address deleted successfully"
}
```

## Login API Integration

When users log in, their addresses are automatically included in the response:

**Login Response:**
```json
{
  "success": true,
  "message": "Authentication successful",
  "data": {
    "user": {
      "_id": "...",
      "username": "johndoe",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "addresses": [
        {
          "_id": "...",
          "addressType": "home",
          "isDefault": true,
          "contactName": "John Doe",
          "street": "123 Main St",
          "city": "Sydney",
          "state": "NSW",
          "postalCode": "2000",
          "country": "Australia",
          "fullAddress": "123 Main St, Sydney, NSW, 2000, Australia"
        }
      ]
    },
    "accessToken": "...",
    "expiresIn": "15m"
  }
}
```

## Error Responses

### Validation Error (400)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Input validation failed",
    "details": [
      {
        "field": "contactName",
        "message": "Contact name is required",
        "value": ""
      }
    ]
  }
}
```

### Not Found (404)
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Address not found"
  }
}
```

### Server Error (500)
```json
{
  "success": false,
  "error": {
    "code": "SERVER_ERROR",
    "message": "An error occurred while processing the request"
  }
}
```

## Business Rules

1. **Default Address**: Only one address can be set as default per user
2. **First Address**: The first address created is automatically set as default
3. **Soft Delete**: Addresses are soft deleted (isActive: false) rather than hard deleted
4. **Default Management**: When the default address is deleted, another address is automatically set as default
5. **User Isolation**: Users can only access their own addresses
6. **Address Types**: Supported types are 'home', 'work', 'billing', 'shipping', 'other'

## Usage Examples

### Creating a Home Address
```bash
curl -X POST /api/addresses \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "addressType": "home",
    "isDefault": true,
    "contactName": "John Doe",
    "street": "123 Main Street",
    "city": "Sydney",
    "state": "NSW",
    "postalCode": "2000",
    "country": "Australia"
  }'
```

### Getting All Home Addresses
```bash
curl -X GET "/api/addresses?addressType=home" \
  -H "Authorization: Bearer <token>"
```

### Setting Default Address
```bash
curl -X PATCH /api/addresses/64a1b2c3d4e5f6789012345/set-default \
  -H "Authorization: Bearer <token>"
```

## Notes

- All timestamps are in ISO 8601 format
- Phone numbers should be in international format (e.g., +61412345678)
- Coordinates are optional but useful for delivery services
- The `fullAddress` and `shortAddress` are virtual fields computed from the address components
- Addresses are automatically sorted with default addresses first, then by creation date
