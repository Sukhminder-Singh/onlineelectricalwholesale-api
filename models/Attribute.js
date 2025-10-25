const mongoose = require('mongoose');

const AttributeSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true, 
        trim: true,
        unique: true 
    },
    type: { 
        type: String, 
        required: true, 
        enum: ['text', 'number', 'select'],
        default: 'text'
    },
    options: [{ 
        type: String, 
        trim: true 
    }],
    isRequired: { 
        type: Boolean, 
        default: false 
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },
    description: { 
        type: String, 
        trim: true 
    },
    order: { 
        type: Number, 
        default: 0 
    },
    validation: {
        minLength: Number,
        maxLength: Number,
        minValue: Number,
        maxValue: Number,
        pattern: String
    }
}, { 
    timestamps: true 
});

// Index for better query performance
AttributeSchema.index({ type: 1 });
AttributeSchema.index({ isActive: 1 });
AttributeSchema.index({ order: 1 });

module.exports = mongoose.model('Attribute', AttributeSchema); 