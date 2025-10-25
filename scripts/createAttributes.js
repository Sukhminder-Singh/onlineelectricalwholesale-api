const mongoose = require('mongoose');
const Attribute = require('../models/Attribute');
require('dotenv').config({ path: './config.env' });

const initialAttributes = [
    {
        name: 'Dimensions',
        type: 'text',
        description: 'Product dimensions (length x width x height)',
        isRequired: false,
        isActive: true,
        order: 1
    },
    {
        name: 'Color',
        type: 'select',
        options: ['Red', 'Blue', 'Green', 'Black', 'White', 'Yellow', 'Orange', 'Purple', 'Pink', 'Brown', 'Gray', 'Silver', 'Gold'],
        description: 'Product color options',
        isRequired: false,
        isActive: true,
        order: 2
    },
    {
        name: 'Material',
        type: 'text',
        description: 'Primary material used in the product',
        isRequired: false,
        isActive: true,
        order: 3
    },
    {
        name: 'Weight',
        type: 'number',
        description: 'Product weight in grams or pounds',
        isRequired: false,
        isActive: true,
        order: 4,
        validation: {
            minValue: 0
        }
    },
    {
        name: 'Brand',
        type: 'text',
        description: 'Product brand name',
        isRequired: false,
        isActive: true,
        order: 5
    },
    {
        name: 'Model',
        type: 'text',
        description: 'Product model number or name',
        isRequired: false,
        isActive: true,
        order: 6
    },
    {
        name: 'Warranty',
        type: 'select',
        options: ['No Warranty', '30 Days', '90 Days', '1 Year', '2 Years', '3 Years', '5 Years', 'Lifetime'],
        description: 'Warranty period for the product',
        isRequired: false,
        isActive: true,
        order: 7
    },
    {
        name: 'Country of Origin',
        type: 'text',
        description: 'Country where the product was manufactured',
        isRequired: false,
        isActive: true,
        order: 8
    },
    {
        name: 'Size',
        type: 'select',
        options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
        description: 'Product size (for clothing and accessories)',
        isRequired: false,
        isActive: true,
        order: 9
    },
    {
        name: 'Capacity',
        type: 'number',
        description: 'Product capacity or volume',
        isRequired: false,
        isActive: true,
        order: 10,
        validation: {
            minValue: 0
        }
    }
];

async function createAttributes() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.DB_URI);
        console.log('Connected to MongoDB');

        // Clear existing attributes
        await Attribute.deleteMany({});
        console.log('Cleared existing attributes');

        // Insert initial attributes
        const createdAttributes = await Attribute.insertMany(initialAttributes);
        console.log(`Created ${createdAttributes.length} attributes:`);
        
        createdAttributes.forEach(attr => {
            console.log(`- ${attr.name} (${attr.type})`);
        });

        console.log('Attribute seeding completed successfully');
    } catch (error) {
        console.error('Error creating attributes:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

// Run the script
createAttributes(); 