# 🚀 Complete API Testing Guide

## 📋 **Postman Collection Setup**

### **1. Import Collection**
1. Open Postman
2. Click "Import" → "Upload Files"
3. Select `Complete_API_Collection.json`
4. Collection will be imported with all endpoints

### **2. Environment Variables**
The collection uses these variables (auto-set by tests):
- `base_url`: `http://localhost:5000`
- `access_token`: Set after login
- `admin_token`: Set after admin login
- `user_id`: Set after user login
- `order_id`: Set after creating order
- `product_id`: Set after creating product
- `customer_id`: Set after creating customer

## 🧪 **Testing Workflow**

### **Phase 1: Authentication & Setup**
1. **Health Check** → Verify server is running
2. **Admin Login** → Get admin token
3. **Register User** → Create test user
4. **Customer Login** → Get user token

### **Phase 2: SMS Testing (Main Focus)**
1. **Create Order** → Triggers SMS notifications
2. **Update Order Status** → Triggers status SMS
3. **Cancel Order** → Triggers cancellation SMS

### **Phase 3: Full API Testing**
1. **Products** → CRUD operations
2. **Customers** → Customer management
3. **Categories & Brands** → Basic operations
4. **Promo Codes** → Discount management
5. **File Upload** → Image uploads

## 📱 **SMS Testing Sequence**

### **Step 1: Create Order (SMS Test)**
```bash
POST /api/orders
Authorization: Bearer {{access_token}}
```

**Expected SMS Messages:**
- ✅ Customer confirmation SMS
- ✅ Admin notification SMS

### **Step 2: Update Order Status (SMS Test)**
```bash
PATCH /api/orders/{{order_id}}/status
Authorization: Bearer {{admin_token}}
```

**Expected SMS Message:**
- ✅ Customer status update SMS

### **Step 3: Cancel Order (SMS Test)**
```bash
PATCH /api/orders/{{order_id}}/cancel
Authorization: Bearer {{access_token}}
```

**Expected SMS Message:**
- ✅ Customer cancellation SMS

## 🔧 **Pre-Test Setup**

### **1. Server Requirements**
- ✅ Server running on port 5000
- ✅ MongoDB connected
- ✅ AWS SNS configured
- ✅ Phone number verified in AWS SNS

### **2. Test Data**
- **Admin credentials**: Use your admin account
- **Test phone number**: `+9784625778` (your number)
- **Product IDs**: Use existing or create new ones

### **3. Environment Check**
```bash
# Check server health
GET http://localhost:5000/health

# Expected response:
{
  "status": "ok",
  "database": "connected",
  "uptime": 123.45
}
```

## 📊 **Expected Responses**

### **Successful Order Creation**
```json
{
  "success": true,
  "data": {
    "_id": "order_id",
    "orderNumber": "ORD-20241205-0001",
    "customer": {
      "phoneNumber": "+9784625778"
    },
    "totalAmount": 89.97,
    "status": "pending"
  },
  "message": "Order created successfully"
}
```

### **SMS Success Logs**
```
✅ Order confirmation SMS sent to +9784625778
✅ Admin notification SMS sent for order ORD-20241205-0001
✅ Order status update SMS sent to +9784625778
```

## 🚨 **Troubleshooting**

### **Common Issues**

#### **1. Authentication Errors**
- **401 Unauthorized**: Check if token is valid
- **403 Forbidden**: Check user role permissions
- **Solution**: Re-login and get fresh token

#### **2. SMS Not Working**
- **No SMS received**: Check AWS SNS configuration
- **Permission denied**: Check IAM user permissions
- **Invalid phone**: Verify phone number format

#### **3. Order Creation Fails**
- **400 Bad Request**: Check request body format
- **Product not found**: Use valid product IDs
- **Validation error**: Check required fields

### **Debug Steps**

1. **Check Server Logs**
   ```bash
   # Look for SMS status messages
   ✅ Order confirmation SMS sent
   ❌ Failed to send SMS
   ```

2. **Verify AWS Configuration**
   ```bash
   # Test SMS directly
   node scripts/testSMS.js
   ```

3. **Check Database**
   ```bash
   # Verify order was created
   GET /api/orders/my-orders
   ```

## 📱 **SMS Message Examples**

### **Order Confirmation**
```
Hi John! Your order #ORD-20241205-0001 has been confirmed. Total: $89.97 (2 items). Status: pending. Thank you for choosing us!
```

### **Status Update**
```
Hi John! Your order #ORD-20241205-0001 has been shipped. Track your order for updates.
```

### **Admin Notification**
```
NEW ORDER ALERT! Order #ORD-20241205-0001 from John Doe (john@example.com). Total: $89.97. Check admin panel for details.
```

### **Cancellation**
```
Hi John! Your order #ORD-20241205-0001 has been cancelled. Reason: Customer requested cancellation. Refund will be processed within 3-5 business days.
```

## 🎯 **Testing Checklist**

### **Authentication**
- [ ] Health check passes
- [ ] Admin login works
- [ ] User registration works
- [ ] User login works
- [ ] Token refresh works

### **SMS Notifications**
- [ ] Order creation sends SMS
- [ ] Admin gets notification SMS
- [ ] Status update sends SMS
- [ ] Order cancellation sends SMS
- [ ] All SMS messages received

### **Order Management**
- [ ] Create order works
- [ ] Get orders works
- [ ] Update order works
- [ ] Cancel order works
- [ ] Order validation works

### **Customer Management**
- [ ] Create customer works
- [ ] Get customers works
- [ ] Update customer works
- [ ] Deactivate customer works
- [ ] Reactivate customer works

### **Product Management**
- [ ] Create product works
- [ ] Get products works
- [ ] Update product works
- [ ] Delete product works
- [ ] Product validation works

## 🚀 **Quick Start Commands**

### **Start Testing**
1. Import collection
2. Run "Health Check"
3. Run "Admin Login"
4. Run "Create Order (SMS Test)"
5. Check your phone for SMS!

### **Full Test Suite**
1. Run all Authentication requests
2. Run all Order requests (SMS testing)
3. Run all Customer requests
4. Run all Product requests
5. Verify all SMS messages received

## 📞 **Support**

If you encounter issues:
1. Check server logs
2. Verify AWS SNS configuration
3. Test with `node scripts/testSMS.js`
4. Check phone number format
5. Verify IAM permissions

Happy Testing! 🎉
