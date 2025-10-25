# 🚀 AWS Lambda Deployment Guide (Alternative)

## ⚠️ **Important Note: Lambda is NOT Recommended for Your API**

This guide is provided for educational purposes. Your Online Wholesale API is **not suitable for Lambda** due to:
- Persistent MongoDB connections
- File upload handling
- Long-running operations
- Complex state management

## 🏗️ **Lambda Architecture (If You Must)**

```
API Gateway → Lambda Functions → RDS Proxy → DocumentDB
           → S3 (File Storage)
           → SNS (SMS)
```

## 📋 **Step 1: Serverless Framework Setup**

### **Install Serverless Framework**
```bash
npm install -g serverless
npm install serverless-offline serverless-dotenv-plugin
```

### **serverless.yml Configuration**
```yaml
service: onlinewholesale-api

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  stage: ${opt:stage, 'dev'}
  environment:
    NODE_ENV: production
    DB_URI: ${env:DB_URI}
    JWT_SECRET: ${env:JWT_SECRET}
    JWT_EXPIRE: ${env:JWT_EXPIRE}
    AWS_BUCKET_NAME: ${env:AWS_BUCKET_NAME}
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - s3:GetObject
            - s3:PutObject
            - s3:DeleteObject
          Resource: "arn:aws:s3:::${env:AWS_BUCKET_NAME}/*"
        - Effect: Allow
          Action:
            - sns:Publish
          Resource: "*"

functions:
  # Authentication
  auth:
    handler: handlers/auth.handler
    events:
      - http:
          path: /api/auth/{proxy+}
          method: ANY
          cors: true

  # Products
  products:
    handler: handlers/products.handler
    events:
      - http:
          path: /api/products/{proxy+}
          method: ANY
          cors: true

  # Orders
  orders:
    handler: handlers/orders.handler
    events:
      - http:
          path: /api/orders/{proxy+}
          method: ANY
          cors: true

  # File Upload
  upload:
    handler: handlers/upload.handler
    events:
      - http:
          path: /api/upload/{proxy+}
          method: ANY
          cors: true

plugins:
  - serverless-offline
  - serverless-dotenv-plugin

custom:
  serverless-offline:
    httpPort: 3000
```

## 📋 **Step 2: Lambda Handler Structure**

### **Create handlers directory**
```
handlers/
├── auth.js
├── products.js
├── orders.js
├── upload.js
└── shared/
    ├── db.js
    ├── response.js
    └── middleware.js
```

### **Example Handler (handlers/products.js)**
```javascript
const { connectDB } = require('./shared/db');
const { successResponse, errorResponse } = require('./shared/response');
const Product = require('../models/Product');

let cachedConnection = null;

const connectToDB = async () => {
  if (cachedConnection) {
    return cachedConnection;
  }
  
  try {
    cachedConnection = await connectDB();
    return cachedConnection;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
};

exports.handler = async (event, context) => {
  // Set Lambda context
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    // Connect to database
    await connectToDB();
    
    const { httpMethod, pathParameters, queryStringParameters, body } = event;
    const productId = pathParameters?.id;
    
    switch (httpMethod) {
      case 'GET':
        if (productId) {
          return await getProductById(productId);
        } else {
          return await getAllProducts(queryStringParameters);
        }
        
      case 'POST':
        return await createProduct(JSON.parse(body || '{}'));
        
      case 'PUT':
        return await updateProduct(productId, JSON.parse(body || '{}'));
        
      case 'DELETE':
        return await deleteProduct(productId);
        
      default:
        return errorResponse(405, 'Method not allowed');
    }
  } catch (error) {
    console.error('Handler error:', error);
    return errorResponse(500, 'Internal server error');
  }
};

const getAllProducts = async (queryParams) => {
  try {
    const { page = 1, limit = 10, category, brand, search } = queryParams || {};
    
    const filter = {};
    if (category) filter.categories = category;
    if (brand) filter.brandId = brand;
    if (search) {
      filter.$or = [
        { productName: { $regex: search, $options: 'i' } },
        { shortDescription: { $regex: search, $options: 'i' } }
      ];
    }
    
    const products = await Product.find(filter)
      .populate('categories', 'name')
      .populate('brandId', 'name')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const total = await Product.countDocuments(filter);
    
    return successResponse({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    return errorResponse(500, 'Failed to fetch products');
  }
};

// ... other handler functions
```

## 📋 **Step 3: Database Connection (RDS Proxy)**

### **Use RDS Proxy for Connection Pooling**
```javascript
// shared/db.js
const mongoose = require('mongoose');

let connection = null;

const connectDB = async () => {
  if (connection) {
    return connection;
  }
  
  try {
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      bufferMaxEntries: 0
    };
    
    connection = await mongoose.connect(process.env.DB_URI, options);
    console.log('Database connected via RDS Proxy');
    return connection;
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
};

module.exports = { connectDB };
```

## 📋 **Step 4: File Upload to S3**

### **Upload Handler**
```javascript
// handlers/upload.js
const AWS = require('aws-sdk');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.AWS_BUCKET_NAME,
    key: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `uploads/${uniqueSuffix}-${file.originalname}`);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE,
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

exports.handler = async (event, context) => {
  try {
    // Parse multipart form data
    const result = await parseMultipartForm(event);
    
    if (result.files && result.files.length > 0) {
      const file = result.files[0];
      
      // Upload to S3
      const uploadParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `uploads/${Date.now()}-${file.filename}`,
        Body: file.content,
        ContentType: file.contentType,
      };
      
      const command = new PutObjectCommand(uploadParams);
      await s3Client.send(command);
      
      const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uploadParams.Key}`;
      
      return successResponse({
        message: 'File uploaded successfully',
        fileUrl,
        filename: file.filename
      });
    } else {
      return errorResponse(400, 'No file provided');
    }
  } catch (error) {
    console.error('Upload error:', error);
    return errorResponse(500, 'Upload failed');
  }
};
```

## 📋 **Step 5: Deployment Commands**

### **Deploy to AWS**
```bash
# Install dependencies
npm install

# Deploy to development
serverless deploy --stage dev

# Deploy to production
serverless deploy --stage prod

# Deploy specific function
serverless deploy function --function products

# View logs
serverless logs -f products --tail

# Remove deployment
serverless remove --stage prod
```

## 📋 **Step 6: Environment Variables**

### **Set Environment Variables**
```bash
# Using AWS CLI
aws ssm put-parameter --name "/onlinewholesale/dev/DB_URI" --value "mongodb+srv://..." --type "SecureString"
aws ssm put-parameter --name "/onlinewholesale/dev/JWT_SECRET" --value "your-secret" --type "SecureString"

# Or use .env file (not recommended for production)
```

## 💰 **Lambda Cost Estimation (Monthly)**

### **Based on 100,000 requests/month:**
- **Lambda executions**: ~$2/month
- **API Gateway**: ~$3.50/month
- **RDS Proxy**: ~$15/month
- **DocumentDB**: ~$120/month
- **S3 Storage**: ~$3/month
- **CloudWatch Logs**: ~$5/month
- **Total**: ~$148.50/month

## 🚨 **Major Limitations & Issues**

### **1. Cold Start Problem**
- **2-5 second delays** on first request
- **Poor user experience** for API calls
- **Solution**: Provisioned concurrency ($$$)

### **2. Database Connection Issues**
- **No persistent connections** - each request creates new connection
- **Connection limits** - MongoDB Atlas has connection limits
- **Solution**: RDS Proxy (additional cost)

### **3. File Upload Complexity**
- **No local file system** - must use S3 directly
- **Complex multipart parsing** in Lambda
- **Size limitations** - 6MB payload limit for API Gateway

### **4. State Management**
- **No shared state** between function invocations
- **Complex session management**
- **Caching challenges**

### **5. Development Complexity**
- **Local testing** is difficult
- **Debugging** is harder
- **Deployment** requires more setup

## 🎯 **When Lambda Makes Sense**

### **Good for:**
- ✅ **Microservices** - small, focused functions
- ✅ **Event-driven** - S3 uploads, SNS notifications
- ✅ **Scheduled tasks** - cron jobs, data processing
- ✅ **API Gateway** - simple CRUD operations
- ✅ **Infrequent usage** - cost-effective for low traffic

### **Bad for:**
- ❌ **Monolithic APIs** - like yours
- ❌ **Persistent connections** - databases, WebSockets
- ❌ **File uploads** - complex multipart handling
- ❌ **Long-running operations** - 15-minute limit
- ❌ **High-frequency requests** - cold start issues

## 🔄 **Migration Strategy (If You Still Want Lambda)**

### **Phase 1: Extract Microservices**
1. **Authentication service** - JWT validation
2. **File upload service** - S3 operations
3. **Notification service** - SMS/Email
4. **Product service** - CRUD operations

### **Phase 2: Use Step Functions**
- **Orchestrate complex workflows**
- **Handle long-running processes**
- **Manage state between functions**

### **Phase 3: Hybrid Approach**
- **Lambda for simple operations**
- **EC2 for complex business logic**
- **API Gateway for routing**

---

## 🎯 **Final Recommendation**

**Stick with EC2 deployment!** 

Your API is a **traditional web application** that benefits from:
- ✅ **Persistent connections**
- ✅ **File system access**
- ✅ **Simpler architecture**
- ✅ **Better performance**
- ✅ **Easier maintenance**

Lambda would add unnecessary complexity and cost for your use case.
