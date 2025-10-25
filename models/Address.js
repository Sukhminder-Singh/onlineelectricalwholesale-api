const mongoose = require('mongoose');

const AddressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
    alias: 'customerId'
  },
  addressType: {
    type: String,
    enum: ['home', 'work', 'billing', 'shipping', 'other'],
    default: 'home'
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  label: {
    type: String,
    trim: true,
    maxlength: [50, 'Label cannot exceed 50 characters']
  },
  contactName: {
    type: String,
    trim: true,
    maxlength: [100, 'Contact name cannot exceed 100 characters']
  },
  contactPhone: {
    type: String,
    trim: true,
    match: [/^\+?[1-9]\d{7,14}$/, 'Please enter a valid phone number in international format']
  },
  street: {
    type: String,
    // Accept external API field name `line1`
    alias: 'line1',
    trim: true,
    maxlength: [200, 'Street address cannot exceed 200 characters']
  },
  street2: {
    type: String,
    // Accept external API field name `line2`
    alias: 'line2',
    trim: true,
    maxlength: [200, 'Street address 2 cannot exceed 200 characters']
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
    maxlength: [100, 'City name cannot exceed 100 characters']
  },
  state: {
    type: String,
    trim: true,
    maxlength: [100, 'State name cannot exceed 100 characters']
  },
  postalCode: {
    type: String,
    trim: true,
    maxlength: [20, 'Postal code cannot exceed 20 characters']
  },
  country: {
    type: String,
    trim: true,
    maxlength: [100, 'Country name cannot exceed 100 characters']
  },
  coordinates: {
    latitude: {
      type: Number,
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90']
    },
    longitude: {
      type: Number,
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180']
    }
  },
  instructions: {
    type: String,
    trim: true,
    maxlength: [500, 'Delivery instructions cannot exceed 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full address string
AddressSchema.virtual('fullAddress').get(function() {
  const parts = [
    this.street,
    this.street2,
    this.city,
    this.state,
    this.postalCode,
    this.country
  ].filter(part => part && part.trim());
  
  return parts.join(', ');
});

// Virtual for short address (city, state, country)
AddressSchema.virtual('shortAddress').get(function() {
  const parts = [
    this.city,
    this.state,
    this.country
  ].filter(part => part && part.trim());
  
  return parts.join(', ');
});

// Pre-save middleware to handle default address logic
AddressSchema.pre('save', async function(next) {
  // If this address is being set as default, unset other default addresses for this user
  if (this.isDefault && this.isModified('isDefault')) {
    await this.constructor.updateMany(
      { 
        user: this.user, 
        _id: { $ne: this._id },
        isDefault: true 
      },
      { isDefault: false }
    );
  }
  
  // If this is the first address for the user, make it default
  if (this.isNew) {
    const addressCount = await this.constructor.countDocuments({ user: this.user });
    if (addressCount === 0) {
      this.isDefault = true;
    }
  }
  
  next();
});

// Pre-remove middleware to handle default address logic
AddressSchema.pre('remove', async function(next) {
  // If this was the default address, set another address as default
  if (this.isDefault) {
    const nextAddress = await this.constructor.findOne({ 
      user: this.user, 
      _id: { $ne: this._id },
      isActive: true 
    }).sort({ createdAt: 1 });
    
    if (nextAddress) {
      nextAddress.isDefault = true;
      await nextAddress.save();
    }
  }
  
  next();
});

// Indexes for better query performance
AddressSchema.index({ user: 1, isActive: 1 });
AddressSchema.index({ user: 1, isDefault: 1 });
AddressSchema.index({ user: 1, addressType: 1 });
AddressSchema.index({ user: 1, createdAt: -1 });

// Static method to get user's default address
AddressSchema.statics.getDefaultAddress = async function(userId) {
  return this.findOne({ 
    user: userId, 
    isDefault: true, 
    isActive: true 
  });
};

// Static method to get user's addresses by type
AddressSchema.statics.getAddressesByType = async function(userId, addressType) {
  return this.find({ 
    user: userId, 
    addressType: addressType,
    isActive: true 
  }).sort({ createdAt: -1 });
};

// Static method to set default address
AddressSchema.statics.setDefaultAddress = async function(userId, addressId) {
  // First, unset all default addresses for the user
  await this.updateMany(
    { user: userId, isDefault: true },
    { isDefault: false }
  );
  
  // Then set the specified address as default
  const address = await this.findOneAndUpdate(
    { _id: addressId, user: userId, isActive: true },
    { isDefault: true },
    { new: true }
  );
  
  if (!address) {
    throw new Error('Address not found or not accessible');
  }
  
  return address;
};

// Instance method to get formatted address
AddressSchema.methods.getFormattedAddress = function(format = 'full') {
  switch (format) {
    case 'short':
      return this.shortAddress;
    case 'full':
    default:
      return this.fullAddress;
  }
};

module.exports = mongoose.model('Address', AddressSchema);
