const mongoose = require('mongoose');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
require('dotenv').config();

async function checkCategoriesAndBrands() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.DATABASE_URI);
    console.log('✅ Connected to MongoDB');

    // Check Categories
    console.log('\n📁 CATEGORIES:');
    console.log('================');
    const categories = await Category.find({});
    
    if (categories.length === 0) {
      console.log('❌ No categories found in database!');
      console.log('💡 You need to create categories first.');
    } else {
      categories.forEach(cat => {
        console.log(`ID: ${cat._id}`);
        console.log(`Name: ${cat.name}`);
        console.log(`Status: ${cat.status || 'undefined'}`);
        console.log(`Created: ${cat.createdAt}`);
        console.log('---');
      });
    }

    // Check Brands
    console.log('\n🏷️  BRANDS:');
    console.log('================');
    const brands = await Brand.find({});
    
    if (brands.length === 0) {
      console.log('❌ No brands found in database!');
      console.log('💡 You need to create brands first.');
    } else {
      brands.forEach(brand => {
        console.log(`ID: ${brand._id}`);
        console.log(`Name: ${brand.name}`);
        console.log(`Status: ${brand.status || 'undefined'}`);
        console.log(`Created: ${brand.createdAt}`);
        console.log('---');
      });
    }

    // Provide sample request
    if (categories.length > 0 && brands.length > 0) {
      const sampleCategory = categories.find(c => c.status === 'active') || categories[0];
      const sampleBrand = brands.find(b => b.status === 'active') || brands[0];
      
      console.log('\n🎯 SAMPLE REQUEST:');
      console.log('==================');
      console.log(JSON.stringify({
        "productName": "Sample Product",
        "seller": "Sample Seller",
        "sku": "SAMPLE-001",
        "categories": [sampleCategory._id.toString()],
        "brandId": sampleBrand._id.toString(),
        "price": 99.99,
        "stock": 10,
        "shortDescription": "Sample product for testing"
      }, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  }
}

checkCategoriesAndBrands();
