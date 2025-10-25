# Wholesale Product API - Postman Collection

This directory contains a comprehensive Postman collection for testing the Wholesale Product API with sample data and realistic examples.

## 📁 Files Included

1. **Product_API_Collection.json** - Complete Postman collection with all API endpoints
2. **Wholesale_API_Environment.json** - Environment variables for easy configuration
3. **README.md** - This instruction file

## 🚀 Quick Setup

### Step 1: Import Collection and Environment
1. Open Postman
2. Click **Import** button
3. Import both files:
   - `Product_API_Collection.json`
   - `Wholesale_API_Environment.json`

### Step 2: Set Environment
1. Select **Wholesale API Environment** from the environment dropdown
2. Update the `base_url` if your server runs on a different port
3. The `auth_token` will be automatically set after login

### Step 3: Get Authentication Token
1. Go to **Authentication** folder
2. Run **Admin Login** request
3. The auth token will be automatically saved to environment variables

## 📋 Collection Structure

### 🔓 **Public Product Endpoints**
- **Get All Products** - Basic product listing with pagination
- **Get Products with Advanced Filtering** - Multi-parameter filtering example
- **Get Single Product** - Detailed product information
- **Get Products by Category** - Category-specific product listing
- **Get Products by Brand** - Brand-specific product listing

### 🔐 **Admin Product Management**
- **Create Product (JSON)** - Create product with JSON data
- **Create Product with File Upload** - Create product with image uploads
- **Update Product** - Modify existing product
- **Delete Product** - Soft delete (archive) product

### ⚡ **Advanced Product Operations**
- **Bulk Update Products** - Update multiple products at once
- **Duplicate Product** - Clone existing product with modifications
- **Update Product Stock** - Quick stock quantity update

### 📊 **Product Analytics & Reports**
- **Get Product Statistics** - Dashboard statistics
- **Get Low Stock Products** - Products below threshold
- **Get Out of Stock Products** - Zero stock products

## 🎯 Sample Data Included

The collection includes realistic sample data for:

### Gaming Laptop Example
```json
{
  "productName": "Gaming Laptop Pro Max",
  "sku": "LAPTOP-PRO-001",
  "price": 1599.99,
  "comparePrice": 1899.99,
  "categories": ["Electronics", "Computers"],
  "brandId": "TechCorp",
  "attributes": [
    {"id": "processor", "value": "Intel Core i9-13900H"},
    {"id": "graphics", "value": "NVIDIA RTX 4080"},
    {"id": "ram", "value": "32GB DDR5"}
  ]
}
```

### Gaming Mouse Example
```json
{
  "productName": "Wireless Gaming Mouse Elite",
  "sku": "MOUSE-ELITE-001",
  "price": 89.99,
  "attributes": [
    {"id": "dpi", "value": "25600"},
    {"id": "connectivity", "value": "Wireless 2.4GHz + Bluetooth"}
  ]
}
```

## 🔧 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `base_url` | API base URL | `http://localhost:3000/api` |
| `auth_token` | JWT authentication token | Auto-set after login |
| `product_id` | Sample product ID | `507f1f77bcf86cd799439011` |
| `category_id` | Sample category ID | `507f1f77bcf86cd799439012` |
| `brand_id` | Sample brand ID | `507f1f77bcf86cd799439013` |

## 📝 Usage Instructions

### 1. Authentication Required Endpoints
Most admin endpoints require authentication. Make sure to:
1. Run the **Admin Login** request first
2. The token will be automatically set in the environment
3. All subsequent requests will use this token

### 2. File Upload Requests
For requests with file uploads:
1. Use the **Create Product with File Upload** example
2. Replace the file paths in form-data with actual image files
3. Supported formats: JPG, PNG, GIF, WebP

### 3. Multi-Category Products
To create products with multiple categories:
```json
{
  "categories": ["category_id_1", "category_id_2", "category_id_3"]
}
```

### 4. Advanced Filtering
Use query parameters for filtering:
```
/products?categories=cat1,cat2&brandId=brand1&minPrice=100&maxPrice=1000&search=laptop
```

## 🧪 Testing Features

The collection includes automatic tests for:
- ✅ Response status validation
- ✅ Response structure validation  
- ✅ Automatic token extraction
- ✅ Automatic ID extraction for chaining requests

## 🔍 Sample Queries

### Search Products
```
GET /products?search=gaming&page=1&limit=10
```

### Filter by Multiple Categories
```
GET /products?categories=electronics,computers&brandId=techcorp
```

### Price Range Filter
```
GET /products?minPrice=500&maxPrice=2000&sort=-price
```

### Stock Status Filter
```
GET /products?stockStatus=low_stock&isPublished=true
```

## 🚨 Prerequisites

Before using this collection:

1. **Server Running**: Ensure your API server is running on the specified port
2. **Database Setup**: Make sure MongoDB is connected and running
3. **Admin User**: Create an admin user using the provided script:
   ```bash
   node scripts/createAdmin.js
   ```
4. **Categories & Brands**: Create some sample categories and brands first
5. **File Upload Setup**: Ensure S3 or local file upload is configured

## 🔄 Request Flow

Recommended testing flow:
1. **Login** → Get authentication token
2. **Create Categories/Brands** → Set up product dependencies  
3. **Create Products** → Add sample products
4. **Test Filtering** → Verify search and filter functionality
5. **Update Products** → Test modification features
6. **Analytics** → Check statistics and reports

## 📞 Support

If you encounter issues:
1. Check server logs for detailed error messages
2. Verify environment variables are set correctly
3. Ensure all prerequisites are met
4. Check API documentation for latest changes

## 🎉 Happy Testing!

This collection provides comprehensive coverage of all Product API endpoints with realistic sample data. Use it to test functionality, validate responses, and understand the API structure.
