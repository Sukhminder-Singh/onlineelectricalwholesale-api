# 🚀 AWS Deployment Guide for Online Wholesale API

## 🎯 **Recommended Architecture: EC2 + RDS + S3**

### **Architecture Overview**
```
Internet → CloudFront → ALB → EC2 (API) → RDS (MongoDB Atlas) → S3 (File Storage)
```

## 📋 **Step 1: EC2 Instance Setup**

### **Instance Configuration**
- **Instance Type**: `t3.medium` (2 vCPU, 4GB RAM) - Start here, scale up as needed
- **AMI**: Amazon Linux 2 or Ubuntu 20.04 LTS
- **Storage**: 20GB GP3 EBS volume
- **Security Group**: Allow HTTP (80), HTTPS (443), SSH (22)

### **EC2 Setup Commands**
```bash
# Update system
sudo yum update -y  # Amazon Linux
# or
sudo apt update && sudo apt upgrade -y  # Ubuntu

# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx
sudo yum install -y nginx  # Amazon Linux
# or
sudo apt install -y nginx  # Ubuntu
```

## 📋 **Step 2: Application Deployment**

### **Deploy Your Code**
```bash
# Clone your repository
git clone <your-repo-url>
cd onlinewholesale_api

# Install dependencies
npm install --production

# Create production environment file
sudo nano /opt/api/config.env
```

### **Production Environment Variables**
```env
NODE_ENV=production
PORT=3000
DB_URI=mongodb+srv://username:password@cluster.mongodb.net/onlinewholesale?retryWrites=true&w=majority
JWT_SECRET=your-super-secure-jwt-secret-here
JWT_EXPIRE=7d

# AWS Configuration
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=your-s3-bucket
CLOUDFRONT_DOMAIN=your-cloudfront-domain

# SMS Configuration (Optional)
AWS_SNS_REGION=us-east-1
```

### **PM2 Configuration**
Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'onlinewholesale-api',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/error.log',
    out_file: '/var/log/pm2/out.log',
    log_file: '/var/log/pm2/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

### **Start Application**
```bash
# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 📋 **Step 3: Nginx Configuration**

### **Nginx Config** (`/etc/nginx/conf.d/api.conf`)
```nginx
upstream api_backend {
    server 127.0.0.1:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name your-domain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # File upload size
    client_max_body_size 10M;

    # API routes
    location /api/ {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Health check
    location /health {
        proxy_pass http://api_backend;
        access_log off;
    }

    # Static files (if not using S3)
    location /uploads/ {
        alias /opt/api/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 📋 **Step 4: SSL Certificate (Let's Encrypt)**

```bash
# Install Certbot
sudo yum install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

## 📋 **Step 5: Database Setup**

### **MongoDB Atlas (Recommended)**
1. Create cluster on MongoDB Atlas
2. Configure network access (add EC2 IP)
3. Create database user
4. Update `DB_URI` in config.env

### **Alternative: RDS with DocumentDB**
- Use Amazon DocumentDB for MongoDB compatibility
- Better integration with AWS services

## 📋 **Step 6: File Storage (S3)**

### **S3 Bucket Setup**
```bash
# Create S3 bucket
aws s3 mb s3://your-wholesale-api-files

# Configure bucket policy for public read access to uploads
# Set up CloudFront distribution for better performance
```

## 📋 **Step 7: Monitoring & Logging**

### **CloudWatch Integration**
```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
sudo rpm -U ./amazon-cloudwatch-agent.rpm

# Configure CloudWatch
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
```

### **Application Monitoring**
- Use PM2 monitoring: `pm2 monit`
- Set up CloudWatch alarms for CPU, memory, disk usage
- Monitor API response times and error rates

## 📋 **Step 8: Auto-Scaling (Optional)**

### **Application Load Balancer + Auto Scaling Group**
1. Create Application Load Balancer
2. Create Launch Template with your EC2 configuration
3. Create Auto Scaling Group (min: 1, max: 5)
4. Set up CloudWatch alarms for scaling triggers

## 💰 **Cost Estimation (Monthly)**

### **Single EC2 Setup**
- **EC2 t3.medium**: ~$30/month
- **EBS 20GB**: ~$2/month
- **MongoDB Atlas M10**: ~$57/month
- **S3 Storage (100GB)**: ~$3/month
- **CloudFront**: ~$1/month
- **Total**: ~$93/month

### **Scaled Setup (ALB + ASG)**
- **EC2 instances**: $30-150/month (depending on load)
- **Application Load Balancer**: ~$18/month
- **MongoDB Atlas M30**: ~$120/month
- **S3 + CloudFront**: ~$5/month
- **Total**: ~$173-293/month

## 🔧 **Deployment Script**

Create `deploy.sh`:
```bash
#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Pull latest code
git pull origin main

# Install dependencies
npm install --production

# Restart application
pm2 restart onlinewholesale-api

# Reload Nginx
sudo nginx -t && sudo systemctl reload nginx

echo "✅ Deployment completed!"
```

## 🚨 **Security Checklist**

- [ ] Enable VPC with private subnets
- [ ] Use Security Groups with minimal access
- [ ] Enable CloudTrail for API logging
- [ ] Set up AWS WAF for DDoS protection
- [ ] Use AWS Secrets Manager for sensitive data
- [ ] Enable MFA for AWS console access
- [ ] Regular security updates
- [ ] Backup strategy for database

## 📊 **Performance Optimization**

1. **Enable Gzip compression** in Nginx
2. **Use Redis** for session storage and caching
3. **Implement CDN** with CloudFront
4. **Database indexing** optimization
5. **Connection pooling** for MongoDB
6. **Image optimization** and WebP conversion

---

## 🆚 **Why Not Lambda?**

### **Lambda Limitations for Your API:**
- ❌ **Cold starts** (2-5 seconds) - bad for user experience
- ❌ **15-minute execution limit** - problematic for long operations
- ❌ **No persistent connections** - MongoDB connections reset
- ❌ **File system limitations** - can't store uploads locally
- ❌ **Complex state management** - your API has complex business logic
- ❌ **Higher costs** for consistent traffic

### **When to Consider Lambda:**
- Microservices architecture
- Event-driven functions
- Infrequent, short-running tasks
- Serverless-first applications

---

## 🎯 **Final Recommendation**

**Start with EC2 single instance** → **Scale to ALB + ASG** as your business grows.

This gives you:
- ✅ **Reliability** and **performance**
- ✅ **Cost-effective** for your traffic patterns
- ✅ **Easy maintenance** and **monitoring**
- ✅ **Room to grow** with auto-scaling
- ✅ **Full control** over your environment
