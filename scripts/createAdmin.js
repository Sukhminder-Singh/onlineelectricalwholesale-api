// Load environment variables
const path = require('path');
const fs = require('fs');
const NODE_ENV = process.env.NODE_ENV || 'development';

const envFiles = [`.env.${NODE_ENV}`, '.env', 'config.env'];
for (const envFile of envFiles) {
  const envPath = path.resolve(__dirname, '..', envFile);
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    break;
  }
}

const mongoose = require('mongoose');
const User = require('../models/User');

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    console.log(process.env.DB_URI);
    await mongoose.connect(process.env.DB_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'Admin123!',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'
    });

    console.log('Admin user created successfully:');
    console.log('Username: admin');
    console.log('Email: admin@example.com');
    console.log('Password: Admin123!');
    console.log('Role: admin');

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
};

createAdminUser(); 