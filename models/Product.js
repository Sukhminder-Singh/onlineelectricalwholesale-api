const mongoose = require('mongoose');

const AttributeSchema = new mongoose.Schema({
  id: String,
  value: mongoose.Schema.Types.Mixed
}, { _id: false });

const QuantityLevelSchema = new mongoose.Schema({
  level: Number,
  minQuantity: String,
  maxQuantity: String,
  price: String,
  discount: String
}, { _id: false });

const ParcelSchema = new mongoose.Schema({
  width: String,
  height: String,
  length: String,
  weight: String
}, { _id: false });

const MetaSchema = new mongoose.Schema({
  title: String,
  description: String,
  keywords: String
}, { _id: false });

const AdditionalFieldSchema = new mongoose.Schema({
  label: String,
  type: String,
  value: String
}, { _id: false });

const ProductSchema = new mongoose.Schema({
  // Basic Information
  productName: { 
    type: String, 
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  seller: {
    type: String,
    trim: true,
    maxlength: [100, 'Seller name cannot exceed 100 characters']
  },
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [50, 'SKU cannot exceed 50 characters']
  },
  
  // Category and Brand (Multi-select categories as per design)
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'At least one category is required']
  }],
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: [true, 'Brand is required']
  },
  
  // Pricing
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0.01, 'Price must be greater than 0']
  },
  comparePrice: {
    type: Number,
    min: [0, 'Compare price cannot be negative']
  },
  costPrice: {
    type: Number,
    min: [0, 'Cost price cannot be negative']
  },
  
  // Inventory
  stock: {
    type: Number,
    default: 0,
    min: [0, 'Stock cannot be negative']
  },
  stockStatus: {
    type: String,
    enum: ['in_stock', 'out_of_stock', 'low_stock', 'pre_order'],
    default: 'in_stock'
  },
  lowStockThreshold: {
    type: Number,
    default: 10,
    min: [0, 'Low stock threshold cannot be negative']
  },
  trackQuantity: {
    type: Boolean,
    default: true
  },
  
  // Tax and Policies
  taxRate: {
    type: Number,
    default: 0,
    min: [0, 'Tax rate cannot be negative'],
    max: [100, 'Tax rate cannot exceed 100%']
  },
  guaranteePeriod: {
    type: String,
    trim: true
  },
  isReturnable: {
    type: Boolean,
    default: true
  },
  isCancelable: {
    type: Boolean,
    default: true
  },
  isDeliveryAvailable: {
    type: Boolean,
    default: false
  },
  
  // Descriptions
  shortDescription: {
    type: String,
    trim: true,
    maxlength: [500, 'Short description cannot exceed 500 characters']
  },
  longDescription: {
    type: String,
    trim: true,
    maxlength: [5000, 'Long description cannot exceed 5000 characters']
  },
  
  // Images and Files
  mainImage: {
    type: String,
    trim: true
  },
  otherImages: [{
    type: String,
    trim: true
  }],
  image360Url: {
    type: String,
    trim: true
  },
  specificationsFile: {
    type: String,
    trim: true
  },
  
  // Product Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'draft', 'archived'],
    default: 'active'
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: {
    type: Date
  },
  
  // Featured Product Fields
  isFeatured: {
    type: Boolean,
    default: false,
    index: true
  },
  featuredOrder: {
    type: Number,
    default: 0,
    index: true
  },
  featuredUntil: {
    type: Date,
    index: true
  },
  
  // Weight and Dimensions
  weight: {
    type: Number,
    min: [0, 'Weight cannot be negative']
  },
  dimensions: {
    length: {
      type: Number,
      min: [0, 'Length cannot be negative']
    },
    width: {
      type: Number,
      min: [0, 'Width cannot be negative']
    },
    height: {
      type: Number,
      min: [0, 'Height cannot be negative']
    }
  },
  
  // Complex Fields
  attributes: [AttributeSchema],
  quantityLevels: [QuantityLevelSchema],
  parcel: ParcelSchema,
  additionalFields: [AdditionalFieldSchema],
  meta: MetaSchema,
  
  // Audit Fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deletedAt: {
    type: Date
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
ProductSchema.index({ categories: 1 });
ProductSchema.index({ brandId: 1 });
ProductSchema.index({ status: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ createdAt: -1 });
ProductSchema.index({ productName: 'text', shortDescription: 'text' });

// Featured product indexes
ProductSchema.index({ isFeatured: 1, featuredOrder: 1 });
ProductSchema.index({ isFeatured: 1, featuredUntil: 1 });
ProductSchema.index({ isFeatured: 1, status: 1, isPublished: 1 });

// Virtual fields
ProductSchema.virtual('isLowStock').get(function() {
  return this.trackQuantity && this.stock <= this.lowStockThreshold;
});

ProductSchema.virtual('discountPercentage').get(function() {
  if (this.comparePrice && this.comparePrice > this.price) {
    return Math.round(((this.comparePrice - this.price) / this.comparePrice) * 100);
  }
  return 0;
});

ProductSchema.virtual('profitMargin').get(function() {
  if (this.costPrice && this.price > this.costPrice) {
    return Math.round(((this.price - this.costPrice) / this.price) * 100);
  }
  return 0;
});

// Pre-save middleware
ProductSchema.pre('save', function(next) {
  // Auto-update stock status based on quantity
  if (this.trackQuantity) {
    if (this.stock === 0) {
      this.stockStatus = 'out_of_stock';
    } else if (this.stock <= this.lowStockThreshold) {
      this.stockStatus = 'low_stock';
    } else {
      this.stockStatus = 'in_stock';
    }
  }
  
  // Set published date when first published
  if (this.isPublished && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  next();
});

module.exports = mongoose.model('Product', ProductSchema);