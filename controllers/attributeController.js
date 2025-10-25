const Attribute = require('../models/Attribute');
const { 
  NotFoundError, 
  ConflictError, 
  ValidationError,
  asyncHandler 
} = require('../middleware/errorHandler');

// Get all attributes
exports.getAllAttributes = asyncHandler(async (req, res, next) => {
    const { isActive, type, sortBy = 'order', sortOrder = 'asc' } = req.query;
    
    let query = {};
    
    // Filter by active status
    if (isActive !== undefined) {
        query.isActive = isActive === 'true';
    }
    
    // Filter by type
    if (type) {
        query.type = type;
    }
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const attributes = await Attribute.find(query)
        .sort(sort)
        .select('-__v');
        
    res.status(200).json({
        success: true,
        message: 'Attributes retrieved successfully',
        data: attributes,
        count: attributes.length
    });
});

// Get single attribute by ID
exports.getAttributeById = asyncHandler(async (req, res, next) => {
    const attribute = await Attribute.findById(req.params.id).select('-__v');
    
    if (!attribute) {
        throw new NotFoundError('Attribute');
    }
    
    res.status(200).json({
        success: true,
        message: 'Attribute retrieved successfully',
        data: attribute
    });
});

// Create new attribute
exports.createAttribute = asyncHandler(async (req, res, next) => {
    const { name, type, options, isRequired, description, validation } = req.body;
    
    // Check if attribute with same name already exists
    const existingAttribute = await Attribute.findOne({ name: name.trim() });
    if (existingAttribute) {
        throw new ConflictError('Attribute with this name already exists');
    }
    
    // Get the highest order number
    const lastAttribute = await Attribute.findOne().sort({ order: -1 });
    const order = lastAttribute ? lastAttribute.order + 1 : 1;
    
    const attribute = new Attribute({
        name: name.trim(),
        type,
        options: options || [],
        isRequired: isRequired || false,
        description: description?.trim(),
        order,
        validation
    });
    
    const savedAttribute = await attribute.save();
    
    res.status(201).json({
        success: true,
        message: 'Attribute created successfully',
        data: savedAttribute
    });
});

// Update attribute
exports.updateAttribute = asyncHandler(async (req, res, next) => {
    const { name, type, options, isRequired, description, validation, isActive } = req.body;
    
    // Check if attribute exists
    const existingAttribute = await Attribute.findById(req.params.id);
    if (!existingAttribute) {
        throw new NotFoundError('Attribute');
    }
    
    // Check if name is being changed and if it conflicts with existing attribute
    if (name && name.trim() !== existingAttribute.name) {
        const nameConflict = await Attribute.findOne({ 
            name: name.trim(), 
            _id: { $ne: req.params.id } 
        });
        if (nameConflict) {
            throw new ConflictError('Attribute with this name already exists');
        }
    }
    
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (type !== undefined) updateData.type = type;
    if (options !== undefined) updateData.options = options;
    if (isRequired !== undefined) updateData.isRequired = isRequired;
    if (description !== undefined) updateData.description = description?.trim();
    if (validation !== undefined) updateData.validation = validation;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const updatedAttribute = await Attribute.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
    ).select('-__v');
    
    res.status(200).json({
        success: true,
        message: 'Attribute updated successfully',
        data: updatedAttribute
    });
});

// Delete attribute
exports.deleteAttribute = asyncHandler(async (req, res, next) => {
    const attribute = await Attribute.findById(req.params.id);
    
    if (!attribute) {
        throw new NotFoundError('Attribute');
    }
    
    await Attribute.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
        success: true,
        message: 'Attribute deleted successfully'
    });
});

// Toggle attribute status
exports.toggleAttributeStatus = asyncHandler(async (req, res, next) => {
    const attribute = await Attribute.findById(req.params.id);
    
    if (!attribute) {
        throw new NotFoundError('Attribute');
    }
    
    attribute.isActive = !attribute.isActive;
    const updatedAttribute = await attribute.save();
    
    res.status(200).json({
        success: true,
        message: `Attribute ${updatedAttribute.isActive ? 'activated' : 'deactivated'} successfully`,
        data: updatedAttribute
    });
});

// Update attribute order
exports.updateAttributeOrder = asyncHandler(async (req, res, next) => {
    const { attributes } = req.body;
    
    if (!Array.isArray(attributes)) {
        throw new ValidationError('Attributes must be an array');
    }
    
    // Update each attribute's order
    const updatePromises = attributes.map(({ id, order }) => 
        Attribute.findByIdAndUpdate(id, { order }, { new: true })
    );
    
    await Promise.all(updatePromises);
    
    res.status(200).json({
        success: true,
        message: 'Attribute order updated successfully'
    });
});

// Bulk update attributes
exports.bulkUpdateAttributes = asyncHandler(async (req, res, next) => {
    const { attributes } = req.body;
    
    if (!Array.isArray(attributes)) {
        throw new ValidationError('Attributes must be an array');
    }
    
    const updatePromises = attributes.map(attribute => 
        Attribute.findByIdAndUpdate(attribute._id, attribute, { new: true, runValidators: true })
    );
    
    const updatedAttributes = await Promise.all(updatePromises);
    
    res.status(200).json({
        success: true,
        message: 'Attributes updated successfully',
        data: updatedAttributes
    });
});

// Get attribute statistics
exports.getAttributeStats = asyncHandler(async (req, res, next) => {
    const totalAttributes = await Attribute.countDocuments();
    const activeAttributes = await Attribute.countDocuments({ isActive: true });
    const textAttributes = await Attribute.countDocuments({ type: 'text' });
    const numberAttributes = await Attribute.countDocuments({ type: 'number' });
    const selectAttributes = await Attribute.countDocuments({ type: 'select' });
    
    res.status(200).json({
        success: true,
        message: 'Attribute statistics retrieved successfully',
        data: {
            total: totalAttributes,
            active: activeAttributes,
            inactive: totalAttributes - activeAttributes,
            byType: {
                text: textAttributes,
                number: numberAttributes,
                select: selectAttributes
            }
        }
    });
}); 