# Transaction API Documentation

## Overview
The Transaction API provides comprehensive payment processing functionality for the Online Wholesale platform. It handles transaction creation, status management, refunds, and reporting.

## Base URL
```
/api/transactions
```

## Authentication
All endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Transaction Model Structure

```json
{
  "id": "507f1f77bcf86cd799439011",
  "transactionId": "TXN-2024-01-15-001",
  "orderId": "ORD-2024-01-15-0001",
  "customer": {
    "id": "c1",
    "name": "Sarah Johnson",
    "email": "sarah.johnson@email.com"
  },
  "amount": 2598.00,
  "paymentMethod": "Credit Card",
  "status": "Completed",
  "transactionDate": "2024-01-15T10:30:00Z",
  "description": "MacBook Pro 16\" + Accessories",
  "currency": "USD",
  "fees": 77.94,
  "netAmount": 2520.06,
  "reference": "visa-****1234",
  "invoice": {
    "invoiceNumber": "INV-2024-001",
    "invoiceDate": "2024-01-15T10:30:00Z",
    "dueDate": "2024-02-14T23:59:59Z",
    "status": "Paid",
    "totalAmount": 2755.84
  },
  "gatewayTransactionId": "gateway_txn_12345",
  "gatewayResponse": {},
  "refundAmount": 0,
  "refundDate": null,
  "refundReason": null,
  "notes": "Payment processed successfully",
  "isActive": true,
  "processedBy": "507f1f77bcf86cd799439012",
  "processedAt": "2024-01-15T10:35:00Z",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:35:00Z"
}
```

## Endpoints

### 1. Create Transaction
**POST** `/api/transactions`

Creates a new transaction for an order.

**Request Body:**
```json
{
  "orderId": "ORD-2024-01-15-0001",
  "customer": {
    "id": "c1",
    "name": "Sarah Johnson",
    "email": "sarah.johnson@email.com"
  },
  "amount": 2598.00,
  "paymentMethod": "Credit Card",
  "description": "MacBook Pro 16\" + Accessories",
  "currency": "USD",
  "fees": 77.94,
  "reference": "visa-****1234",
  "invoice": {
    "invoiceNumber": "INV-2024-001",
    "invoiceDate": "2024-01-15T10:30:00Z",
    "dueDate": "2024-02-14T23:59:59Z",
    "status": "Pending",
    "totalAmount": 2755.84
  },
  "notes": "Payment processing"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionId": "TXN-2024-01-15-001",
    "orderId": "ORD-2024-01-15-0001",
    "customer": {
      "id": "c1",
      "name": "Sarah Johnson",
      "email": "sarah.johnson@email.com"
    },
    "amount": 2598.00,
    "paymentMethod": "Credit Card",
    "status": "Pending",
    "transactionDate": "2024-01-15T10:30:00Z",
    "description": "MacBook Pro 16\" + Accessories",
    "currency": "USD",
    "fees": 77.94,
    "netAmount": 2520.06,
    "reference": "visa-****1234",
    "invoice": {
      "invoiceNumber": "INV-2024-001",
      "invoiceDate": "2024-01-15T10:30:00Z",
      "dueDate": "2024-02-14T23:59:59Z",
      "status": "Pending",
      "totalAmount": 2755.84
    },
    "processedBy": {
      "_id": "507f1f77bcf86cd799439012",
      "username": "admin",
      "firstName": "Admin",
      "lastName": "User"
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "message": "Transaction created successfully"
}
```

### 2. Get All Transactions (Admin Only)
**GET** `/api/transactions/admin/all`

Retrieves all transactions with filtering and pagination.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `status` (string): Filter by status
- `paymentMethod` (string): Filter by payment method
- `customer` (string): Filter by customer email
- `dateFrom` (string): Start date (ISO 8601)
- `dateTo` (string): End date (ISO 8601)
- `search` (string): Search in transaction ID, order ID, customer name, or email
- `sortBy` (string): Sort field (default: transactionDate)
- `sortOrder` (string): Sort order - 'asc' or 'desc' (default: desc)

**Example:**
```
GET /api/transactions/admin/all?page=1&limit=10&status=Completed&dateFrom=2024-01-01&dateTo=2024-01-31
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "transactionId": "TXN-2024-01-15-001",
      "orderId": "ORD-2024-01-15-0001",
      "customer": {
        "id": "c1",
        "name": "Sarah Johnson",
        "email": "sarah.johnson@email.com"
      },
      "amount": 2598.00,
      "paymentMethod": "Credit Card",
      "status": "Completed",
      "transactionDate": "2024-01-15T10:30:00Z",
      "description": "MacBook Pro 16\" + Accessories",
      "currency": "USD",
      "fees": 77.94,
      "netAmount": 2520.06,
      "reference": "visa-****1234",
      "invoice": {
        "invoiceNumber": "INV-2024-001",
        "invoiceDate": "2024-01-15T10:30:00Z",
        "dueDate": "2024-02-14T23:59:59Z",
        "status": "Paid",
        "totalAmount": 2755.84
      },
      "processedBy": {
        "_id": "507f1f77bcf86cd799439012",
        "username": "admin",
        "firstName": "Admin",
        "lastName": "User"
      },
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:35:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 50,
    "itemsPerPage": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 3. Get Single Transaction
**GET** `/api/transactions/:id`

Retrieves a specific transaction by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionId": "TXN-2024-01-15-001",
    "orderId": "ORD-2024-01-15-0001",
    "customer": {
      "id": "c1",
      "name": "Sarah Johnson",
      "email": "sarah.johnson@email.com"
    },
    "amount": 2598.00,
    "paymentMethod": "Credit Card",
    "status": "Completed",
    "transactionDate": "2024-01-15T10:30:00Z",
    "description": "MacBook Pro 16\" + Accessories",
    "currency": "USD",
    "fees": 77.94,
    "netAmount": 2520.06,
    "reference": "visa-****1234",
    "invoice": {
      "invoiceNumber": "INV-2024-001",
      "invoiceDate": "2024-01-15T10:30:00Z",
      "dueDate": "2024-02-14T23:59:59Z",
      "status": "Paid",
      "totalAmount": 2755.84
    },
    "gatewayTransactionId": "gateway_txn_12345",
    "gatewayResponse": {
      "status": "success",
      "transactionId": "gateway_txn_12345"
    },
    "refundAmount": 0,
    "refundDate": null,
    "refundReason": null,
    "notes": "Payment processed successfully",
    "isActive": true,
    "processedBy": {
      "_id": "507f1f77bcf86cd799439012",
      "username": "admin",
      "firstName": "Admin",
      "lastName": "User"
    },
    "processedAt": "2024-01-15T10:35:00Z",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:35:00Z"
  }
}
```

### 4. Update Transaction (Admin Only)
**PUT** `/api/transactions/:id`

Updates transaction details.

**Request Body:**
```json
{
  "status": "Completed",
  "notes": "Payment verified and completed",
  "reference": "visa-****1234"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionId": "TXN-2024-01-15-001",
    "orderId": "ORD-2024-01-15-0001",
    "customer": {
      "id": "c1",
      "name": "Sarah Johnson",
      "email": "sarah.johnson@email.com"
    },
    "amount": 2598.00,
    "paymentMethod": "Credit Card",
    "status": "Completed",
    "transactionDate": "2024-01-15T10:30:00Z",
    "description": "MacBook Pro 16\" + Accessories",
    "currency": "USD",
    "fees": 77.94,
    "netAmount": 2520.06,
    "reference": "visa-****1234",
    "invoice": {
      "invoiceNumber": "INV-2024-001",
      "invoiceDate": "2024-01-15T10:30:00Z",
      "dueDate": "2024-02-14T23:59:59Z",
      "status": "Paid",
      "totalAmount": 2755.84
    },
    "notes": "Payment verified and completed",
    "processedBy": {
      "_id": "507f1f77bcf86cd799439012",
      "username": "admin",
      "firstName": "Admin",
      "lastName": "User"
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:40:00Z"
  },
  "message": "Transaction updated successfully"
}
```

### 5. Mark Transaction as Completed (Admin Only)
**PATCH** `/api/transactions/:id/complete`

Marks a pending transaction as completed.

**Request Body:**
```json
{
  "gatewayTransactionId": "gateway_txn_12345",
  "gatewayResponse": {
    "status": "success",
    "transactionId": "gateway_txn_12345",
    "authorizationCode": "AUTH123456"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionId": "TXN-2024-01-15-001",
    "orderId": "ORD-2024-01-15-0001",
    "customer": {
      "id": "c1",
      "name": "Sarah Johnson",
      "email": "sarah.johnson@email.com"
    },
    "amount": 2598.00,
    "paymentMethod": "Credit Card",
    "status": "Completed",
    "transactionDate": "2024-01-15T10:30:00Z",
    "description": "MacBook Pro 16\" + Accessories",
    "currency": "USD",
    "fees": 77.94,
    "netAmount": 2520.06,
    "reference": "visa-****1234",
    "invoice": {
      "invoiceNumber": "INV-2024-001",
      "invoiceDate": "2024-01-15T10:30:00Z",
      "dueDate": "2024-02-14T23:59:59Z",
      "status": "Paid",
      "totalAmount": 2755.84
    },
    "gatewayTransactionId": "gateway_txn_12345",
    "gatewayResponse": {
      "status": "success",
      "transactionId": "gateway_txn_12345",
      "authorizationCode": "AUTH123456"
    },
    "processedBy": {
      "_id": "507f1f77bcf86cd799439012",
      "username": "admin",
      "firstName": "Admin",
      "lastName": "User"
    },
    "processedAt": "2024-01-15T10:35:00Z",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:35:00Z"
  },
  "message": "Transaction marked as completed successfully"
}
```

### 6. Mark Transaction as Failed (Admin Only)
**PATCH** `/api/transactions/:id/fail`

Marks a pending transaction as failed.

**Request Body:**
```json
{
  "gatewayResponse": {
    "status": "failed",
    "errorCode": "INSUFFICIENT_FUNDS",
    "errorMessage": "Insufficient funds in account"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionId": "TXN-2024-01-15-001",
    "orderId": "ORD-2024-01-15-0001",
    "customer": {
      "id": "c1",
      "name": "Sarah Johnson",
      "email": "sarah.johnson@email.com"
    },
    "amount": 2598.00,
    "paymentMethod": "Credit Card",
    "status": "Failed",
    "transactionDate": "2024-01-15T10:30:00Z",
    "description": "MacBook Pro 16\" + Accessories",
    "currency": "USD",
    "fees": 77.94,
    "netAmount": 2520.06,
    "reference": "visa-****1234",
    "invoice": {
      "invoiceNumber": "INV-2024-001",
      "invoiceDate": "2024-01-15T10:30:00Z",
      "dueDate": "2024-02-14T23:59:59Z",
      "status": "Pending",
      "totalAmount": 2755.84
    },
    "gatewayResponse": {
      "status": "failed",
      "errorCode": "INSUFFICIENT_FUNDS",
      "errorMessage": "Insufficient funds in account"
    },
    "processedBy": {
      "_id": "507f1f77bcf86cd799439012",
      "username": "admin",
      "firstName": "Admin",
      "lastName": "User"
    },
    "processedAt": "2024-01-15T10:35:00Z",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:35:00Z"
  },
  "message": "Transaction marked as failed successfully"
}
```

### 7. Process Refund (Admin Only)
**PATCH** `/api/transactions/:id/refund`

Processes a refund for a completed transaction.

**Request Body:**
```json
{
  "refundAmount": 500.00,
  "refundReason": "Customer requested partial refund for damaged item"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionId": "TXN-2024-01-15-001",
    "orderId": "ORD-2024-01-15-0001",
    "customer": {
      "id": "c1",
      "name": "Sarah Johnson",
      "email": "sarah.johnson@email.com"
    },
    "amount": 2598.00,
    "paymentMethod": "Credit Card",
    "status": "Partially Refunded",
    "transactionDate": "2024-01-15T10:30:00Z",
    "description": "MacBook Pro 16\" + Accessories",
    "currency": "USD",
    "fees": 77.94,
    "netAmount": 2520.06,
    "reference": "visa-****1234",
    "invoice": {
      "invoiceNumber": "INV-2024-001",
      "invoiceDate": "2024-01-15T10:30:00Z",
      "dueDate": "2024-02-14T23:59:59Z",
      "status": "Paid",
      "totalAmount": 2755.84
    },
    "gatewayTransactionId": "gateway_txn_12345",
    "gatewayResponse": {
      "status": "success",
      "transactionId": "gateway_txn_12345"
    },
    "refundAmount": 500.00,
    "refundDate": "2024-01-20T14:30:00Z",
    "refundReason": "Customer requested partial refund for damaged item",
    "processedBy": {
      "_id": "507f1f77bcf86cd799439012",
      "username": "admin",
      "firstName": "Admin",
      "lastName": "User"
    },
    "processedAt": "2024-01-15T10:35:00Z",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-20T14:30:00Z"
  },
  "message": "Refund processed successfully"
}
```

### 8. Get Transaction Statistics (Admin Only)
**GET** `/api/transactions/admin/stats`

Retrieves transaction statistics and analytics.

**Query Parameters:**
- `startDate` (string): Start date for statistics (ISO 8601)
- `endDate` (string): End date for statistics (ISO 8601)

**Example:**
```
GET /api/transactions/admin/stats?startDate=2024-01-01&endDate=2024-01-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "statusStats": [
      {
        "_id": "Completed",
        "count": 150,
        "totalAmount": 450000.00,
        "totalNetAmount": 435000.00,
        "totalFees": 15000.00
      },
      {
        "_id": "Pending",
        "count": 25,
        "totalAmount": 75000.00,
        "totalNetAmount": 72500.00,
        "totalFees": 2500.00
      },
      {
        "_id": "Failed",
        "count": 10,
        "totalAmount": 30000.00,
        "totalNetAmount": 29000.00,
        "totalFees": 1000.00
      }
    ],
    "totalTransactions": 185,
    "revenueSummary": {
      "totalTransactions": 150,
      "totalAmount": 450000.00,
      "totalNetAmount": 435000.00,
      "totalFees": 15000.00,
      "averageTransactionValue": 3000.00
    },
    "recentTransactions": [
      {
        "transactionId": "TXN-2024-01-15-001",
        "orderId": "ORD-2024-01-15-0001",
        "customer": {
          "id": "c1",
          "name": "Sarah Johnson",
          "email": "sarah.johnson@email.com"
        },
        "amount": 2598.00,
        "status": "Completed",
        "transactionDate": "2024-01-15T10:30:00Z",
        "processedBy": {
          "_id": "507f1f77bcf86cd799439012",
          "username": "admin",
          "firstName": "Admin",
          "lastName": "User"
        }
      }
    ]
  }
}
```

### 9. Get My Transactions
**GET** `/api/transactions/my-transactions`

Retrieves transactions for the authenticated user's orders.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `status` (string): Filter by status
- `dateFrom` (string): Start date (ISO 8601)
- `dateTo` (string): End date (ISO 8601)

**Example:**
```
GET /api/transactions/my-transactions?page=1&limit=5&status=Completed
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "transactionId": "TXN-2024-01-15-001",
      "orderId": "ORD-2024-01-15-0001",
      "customer": {
        "id": "c1",
        "name": "Sarah Johnson",
        "email": "sarah.johnson@email.com"
      },
      "amount": 2598.00,
      "paymentMethod": "Credit Card",
      "status": "Completed",
      "transactionDate": "2024-01-15T10:30:00Z",
      "description": "MacBook Pro 16\" + Accessories",
      "currency": "USD",
      "fees": 77.94,
      "netAmount": 2520.06,
      "reference": "visa-****1234",
      "invoice": {
        "invoiceNumber": "INV-2024-001",
        "invoiceDate": "2024-01-15T10:30:00Z",
        "dueDate": "2024-02-14T23:59:59Z",
        "status": "Paid",
        "totalAmount": 2755.84
      },
      "processedBy": {
        "_id": "507f1f77bcf86cd799439012",
        "username": "admin",
        "firstName": "Admin",
        "lastName": "User"
      },
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:35:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalItems": 25,
    "itemsPerPage": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 10. Delete Transaction (Admin Only - Soft Delete)
**DELETE** `/api/transactions/:id`

Soft deletes a transaction by setting `isActive` to false.

**Response:**
```json
{
  "success": true,
  "message": "Transaction deleted successfully"
}
```

## API Endpoints Summary

- `POST /api/transactions` - Create transaction
- `GET /api/transactions/admin/all` - Get all transactions (admin)
- `GET /api/transactions/:id` - Get single transaction
- `PUT /api/transactions/:id` - Update transaction (admin)
- `PATCH /api/transactions/:id/complete` - Mark as completed (admin)
- `PATCH /api/transactions/:id/fail` - Mark as failed (admin)
- `PATCH /api/transactions/:id/refund` - Process refund (admin)
- `GET /api/transactions/admin/stats` - Get statistics (admin)
- `GET /api/transactions/my-transactions` - Get user's transactions
- `DELETE /api/transactions/:id` - Delete transaction (admin)

## Status Values

### Transaction Status
- `Pending`: Transaction is being processed
- `Completed`: Transaction completed successfully
- `Failed`: Transaction failed
- `Cancelled`: Transaction was cancelled
- `Refunded`: Transaction was fully refunded
- `Partially Refunded`: Transaction was partially refunded

### Payment Methods
- `Credit Card`
- `Debit Card`
- `Bank Transfer`
- `PayPal`
- `Cash`
- `Check`
- `Wire Transfer`

### Invoice Status
- `Pending`: Invoice is pending payment
- `Paid`: Invoice has been paid
- `Overdue`: Invoice is overdue
- `Cancelled`: Invoice was cancelled

## Error Responses

### Validation Error
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "amount",
      "message": "Amount must be greater than 0",
      "value": -100
    }
  ]
}
```

### Not Found Error
```json
{
  "success": false,
  "message": "Transaction not found"
}
```

### Permission Error
```json
{
  "success": false,
  "message": "You do not have permission to view this transaction"
}
```

### Business Logic Error
```json
{
  "success": false,
  "message": "Only pending transactions can be marked as completed"
}
```

## Rate Limiting
All endpoints are subject to rate limiting. See the main API documentation for rate limit details.

## Notes
- Transaction IDs are automatically generated in the format `TXN-YYYYMMDD-XXX`
- Net amount is automatically calculated as `amount - fees`
- All timestamps are in ISO 8601 format
- Currency codes must be 3-letter uppercase (e.g., USD, EUR, AUD)
- Refund amounts cannot exceed the net amount of the transaction
- Only admins can perform most transaction management operations
- Users can only view transactions for their own orders
