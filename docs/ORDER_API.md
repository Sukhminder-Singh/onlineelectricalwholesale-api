# Order API Documentation

## Overview
The Order API allows customers to create and manage orders. Customer details are automatically pulled from the access token, and shipping addresses are auto-populated from the user's default address.

## Base URL
```
/api/orders
```

## Authentication
All endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Order Creation (Simplified)

### Create Order
**POST** `/api/orders`

Create a new order with minimal required data. Customer details are automatically pulled from the access token.

**Request Body (Minimal):**
```json
{
  "items": [
    {
      "product": "64a1b2c3d4e5f6789012345",
      "quantity": 2
    }
  ],
  "notes": "Please deliver during business hours"
}
```

**Request Body (With Custom Shipping Address):**
```json
{
  "items": [
    {
      "product": "64a1b2c3d4e5f6789012345",
      "quantity": 2,
      "unitPrice": 25.99,
      "discount": 10,
      "taxRate": 10
    }
  ],
  "shippingAddress": {
    "addressLine1": "123 Main Street",
    "addressLine2": "Apt 4B",
    "city": "Sydney",
    "state": "NSW",
    "country": "Australia",
    "postalCode": "2000",
    "phone": "+61412345678"
  },
  "paymentInfo": {
    "paymentMethod": "credit_card"
  },
  "shippingMethod": "express",
  "priority": "high",
  "notes": "Urgent delivery required"
}
```

**Auto-Populated Fields:**
- `customer`: User ID from access token
- `customerEmail`: User email from access token
- `customerPhone`: User phone from access token
- `shippingAddress`: User's default address (if no custom address provided)
- `paymentInfo`: Defaults to invoice payment method
- `currency`: Defaults to AUD
- `status`: Defaults to pending
- `priority`: Defaults to medium

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "64a1b2c3d4e5f6789012346",
    "orderNumber": "ORD-20241201-0001",
    "customer": "64a1b2c3d4e5f6789012345",
    "customerEmail": "john@example.com",
    "customerPhone": "+61412345678",
    "items": [
      {
        "product": "64a1b2c3d4e5f6789012345",
        "productName": "Sample Product",
        "sku": "SP001",
        "quantity": 2,
        "unitPrice": 25.99,
        "totalPrice": 57.18,
        "discount": 10,
        "taxRate": 10,
        "taxAmount": 5.20
      }
    ],
    "subtotal": 51.98,
    "totalDiscount": 5.20,
    "totalTax": 5.20,
    "shippingCost": 0,
    "totalAmount": 51.98,
    "currency": "AUD",
    "status": "pending",
    "priority": "medium",
    "shippingAddress": {
      "addressLine1": "123 Main Street",
      "city": "Sydney",
      "state": "NSW",
      "country": "Australia",
      "postalCode": "2000"
    },
    "paymentInfo": {
      "paymentMethod": "invoice",
      "paymentStatus": "pending"
    },
    "shippingMethod": "standard",
    "trackingHistory": [
      {
        "status": "pending",
        "timestamp": "2024-12-01T10:30:00.000Z",
        "notes": "Order created",
        "updatedBy": "64a1b2c3d4e5f6789012345"
      }
    ],
    "createdAt": "2024-12-01T10:30:00.000Z",
    "updatedAt": "2024-12-01T10:30:00.000Z"
  },
  "message": "Order created successfully"
}
```

## Order Management

### Get My Orders
**GET** `/api/orders/my-orders`

Get all orders for the authenticated user.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status
- `dateFrom` (optional): Filter from date
- `dateTo` (optional): Filter to date

### Get Order by ID
**GET** `/api/orders/:id`

Get a specific order by ID. Users can only access their own orders.

### Update Order
**PUT** `/api/orders/:id`

Update an order. Users can only update limited fields (shipping address, billing address, notes).

### Cancel Order
**PATCH** `/api/orders/:id/cancel`

Cancel an order. Users can only cancel their own orders.

**Request Body:**
```json
{
  "reason": "Changed mind"
}
```

## Admin Operations

### Get All Orders (Admin Only)
**GET** `/api/orders`

Get all orders with filtering and pagination.

### Update Order Status (Admin Only)
**PATCH** `/api/orders/:id/status`

Update order status and add tracking information.

**Request Body:**
```json
{
  "status": "shipped",
  "notes": "Package dispatched via courier"
}
```

### Get Order Statistics (Admin Only)
**GET** `/api/orders/admin/stats`

Get order statistics and analytics.

## Order Statuses

- `pending`: Order created, awaiting confirmation
- `confirmed`: Order confirmed by admin
- `processing`: Order being prepared
- `shipped`: Order dispatched
- `delivered`: Order delivered
- `cancelled`: Order cancelled
- `returned`: Order returned

## Payment Methods

- `credit_card`: Credit card payment
- `bank_transfer`: Bank transfer
- `paypal`: PayPal payment
- `invoice`: Invoice payment (default)
- `cash_on_delivery`: Cash on delivery

## Shipping Methods

- `standard`: Standard shipping
- `express`: Express shipping
- `overnight`: Overnight shipping
- `pickup`: Customer pickup

## Priority Levels

- `low`: Low priority
- `medium`: Medium priority (default)
- `high`: High priority
- `urgent`: Urgent priority

## Error Responses

### Validation Error (400)
```json
{
  "success": false,
  "message": "Order must contain at least one item"
}
```

### No Default Address (400)
```json
{
  "success": false,
  "message": "No shipping address provided and no default address found. Please add an address first."
}
```

### Product Not Found (400)
```json
{
  "success": false,
  "message": "Product with ID 64a1b2c3d4e5f6789012345 not found"
}
```

### Unauthorized (403)
```json
{
  "success": false,
  "message": "You do not have permission to view this order"
}
```

## Business Rules

1. **Customer Details**: Automatically pulled from access token
2. **Default Address**: Uses user's default address if no shipping address provided
3. **Product Validation**: All products must exist and be active
4. **Price Calculation**: Auto-calculates totals, discounts, and taxes
5. **Order Number**: Auto-generated with format ORD-YYYYMMDD-####
6. **Tracking**: Automatic tracking history updates
7. **SMS Notifications**: Automatic SMS notifications for status updates
8. **User Isolation**: Users can only access their own orders (unless admin)

## Usage Examples

### Creating a Simple Order
```bash
curl -X POST /api/orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "product": "64a1b2c3d4e5f6789012345",
        "quantity": 1
      }
    ]
  }'
```

### Creating an Order with Custom Address
```bash
curl -X POST /api/orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "product": "64a1b2c3d4e5f6789012345",
        "quantity": 2
      }
    ],
    "shippingAddress": {
      "addressLine1": "456 Oak Avenue",
      "city": "Melbourne",
      "state": "VIC",
      "country": "Australia",
      "postalCode": "3000"
    },
    "notes": "Please ring doorbell"
  }'
```

### Getting My Orders
```bash
curl -X GET "/api/orders/my-orders?page=1&limit=10&status=pending" \
  -H "Authorization: Bearer <token>"
```

## Notes

- All timestamps are in ISO 8601 format
- Currency defaults to AUD
- Order numbers are unique and auto-generated
- SMS notifications are sent automatically for status updates
- Users must have a default address to create orders without providing shipping address
- Product prices are auto-populated from product catalog
- Tax and discount calculations are automatic
