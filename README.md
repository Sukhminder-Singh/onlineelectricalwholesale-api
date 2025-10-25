# Online Wholesale API

A comprehensive backend API for online wholesale electrical supplier project built with Node.js, Express, and MongoDB.

## 🚀 Features

- **Authentication & Authorization** - JWT-based user authentication with role-based access control
- **Product Management** - CRUD operations for products with attributes and categories
- **File Uploads** - Image upload and management system
- **Geographic Data** - Countries, states, and cities management
- **Brand & Category Management** - Organized product catalog structure
- **Attribute System** - Flexible product attributes with validation
- **Slider Management** - Banner and promotional content management

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer
- **Validation**: Express-validator
- **Security**: bcryptjs for password hashing

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB database (local or Atlas)
- npm or yarn package manager

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd onlinewholesale_api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `config.env` file in the root directory:
   ```env
   PORT=5000
   DB_URI=mongodb://localhost:27017/onlinewholesale
   JWT_SECRET=your_jwt_secret_here
   JWT_EXPIRE=30d
   ```

4. **Database Setup**
   ```bash
   # Create admin user
   npm run create-admin
   
   # Seed initial attributes
   npm run seed-attributes
   ```

5. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile (protected)

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Create product (admin only)
- `PUT /api/products/:id` - Update product (admin only)
- `DELETE /api/products/:id` - Delete product (admin only)

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category (admin only)
- `PUT /api/categories/:id` - Update category (admin only)
- `DELETE /api/categories/:id` - Delete category (admin only)

### Brands
- `GET /api/brands` - Get all brands
- `POST /api/brands` - Create brand (admin only)
- `PUT /api/brands/:id` - Update brand (admin only)
- `DELETE /api/brands/:id` - Delete brand (admin only)

### File Uploads
- `POST /api/upload` - Upload images (admin only)
- `GET /uploads/:filename` - Access uploaded files

### Geographic Data
- `GET /api/countries` - Get all countries
- `GET /api/states` - Get states by country
- `GET /api/cities` - Get cities by state

## 🏗️ Project Structure

```
onlinewholesale_api/
├── app.js                 # Express app configuration
├── server.js             # Server entry point
├── config.env            # Environment variables
├── controllers/          # Route controllers
├── middleware/           # Custom middleware
├── models/              # Mongoose models
├── routes/              # API route definitions
├── scripts/             # Database seeding scripts
├── uploads/             # File upload directory
└── package.json         # Dependencies and scripts
```

## 🔐 Security Features

- Password hashing with bcryptjs
- JWT token authentication
- Role-based access control
- Input validation and sanitization
- CORS configuration
- Environment variable protection

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 5000 |
| `DB_URI` | MongoDB connection string | Required |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRE` | JWT expiration time | 30d |

## 🚀 Deployment

1. Set production environment variables
2. Ensure MongoDB is accessible
3. Run `npm install --production`
4. Start with `npm start`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions, please open an issue in the repository. 
