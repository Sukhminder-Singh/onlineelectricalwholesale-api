const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  image: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  slug: { type: String, unique: true, sparse: true },
  metaTitle: { type: String, default: '' },
  metaDescription: { type: String, default: '' }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for children
CategorySchema.virtual('children', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parent'
});

// Index for better query performance (removed duplicate slug index)
CategorySchema.index({ parent: 1, order: 1 });
CategorySchema.index({ isActive: 1 });

// Pre-save middleware to generate slug if not provided
CategorySchema.pre('save', function(next) {
  if (!this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  next();
});

module.exports = mongoose.model('Category', CategorySchema); 