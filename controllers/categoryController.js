const Category = require('../models/Category');
const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const s3Config = require('../config/s3Config');
const { asyncHandler, AppError, ValidationError } = require('../middleware/errorHandler');
const { logger } = require('../middleware/logger');

// Cache for categories (in-memory cache with TTL)
const categoryCache = {
  data: null,
  timestamp: null,
  ttl: 5 * 60 * 1000, // 5 minutes
  isStale() {
    return !this.timestamp || (Date.now() - this.timestamp) > this.ttl;
  },
  set(data) {
    this.data = data;
    this.timestamp = Date.now();
  },
  get() {
    return this.isStale() ? null : this.data;
  },
  clear() {
    this.data = null;
    this.timestamp = null;
  }
};

// Utility function to clear cache and log the action
const clearCategoryCache = (reason = 'unknown') => {
  categoryCache.clear();
  logger.info(`Category cache cleared: ${reason}`);
};

// Enhanced helper function to build category tree with better performance
const buildCategoryTree = (categories, parentId = null) => {
  // Create a map for O(1) lookup instead of O(n) filter
  const categoryMap = new Map();
  const childrenMap = new Map();
  
  // Build maps for efficient tree construction
  categories.forEach(category => {
    categoryMap.set(category._id.toString(), category);
    const parentKey = category.parent ? category.parent.toString() : 'root';
    if (!childrenMap.has(parentKey)) {
      childrenMap.set(parentKey, []);
    }
    childrenMap.get(parentKey).push(category);
  });
  
  const buildTreeRecursive = (parentKey) => {
    const children = childrenMap.get(parentKey) || [];
    return children
      .map(category => ({
        ...category.toObject(),
        children: buildTreeRecursive(category._id.toString())
      }))
      .sort((a, b) => a.order - b.order);
  };
  
  const parentKey = parentId ? parentId.toString() : 'root';
  return buildTreeRecursive(parentKey);
};

// Helper function to convert category to tree node format
const convertToTreeNode = (category) => ({
  key: category._id.toString(),
  label: category.name,
  data: {
    image: category.image,
    description: category.description,
    slug: category.slug
  },
  isActive: category.isActive,
  children: category.children ? category.children.map(convertToTreeNode) : []
});

// Helper for frontend tree format: only key, label, children
const convertToFrontendTreeNode = (category) => ({
  key: category._id.toString(),
  label: category.name,
  children: category.children ? category.children.map(convertToFrontendTreeNode) : []
});

// Input validation for query parameters
const validateGetCategoriesQuery = (query) => {
  const errors = [];
  
  // Validate format parameter
  if (query.format && !['list', 'tree'].includes(query.format)) {
    errors.push({
      field: 'format',
      message: 'Format must be either "list" or "tree"',
      value: query.format
    });
  }
  
  // Validate isActive parameter
  if (query.isActive !== undefined && !['true', 'false'].includes(query.isActive)) {
    errors.push({
      field: 'isActive',
      message: 'isActive must be either "true" or "false"',
      value: query.isActive
    });
  }
  
  // Validate pagination parameters
  if (query.page && (!Number.isInteger(+query.page) || +query.page < 1)) {
    errors.push({
      field: 'page',
      message: 'Page must be a positive integer',
      value: query.page
    });
  }
  
  if (query.limit && (!Number.isInteger(+query.limit) || +query.limit < 1 || +query.limit > 100)) {
    errors.push({
      field: 'limit',
      message: 'Limit must be a positive integer between 1 and 100',
      value: query.limit
    });
  }
  
  if (errors.length > 0) {
    throw new ValidationError('Invalid query parameters', errors);
  }
};

// Enhanced database query with better error handling
const fetchCategoriesFromDB = async (query, options = {}) => {
  const { page, limit, format } = options;
  
  try {
    let dbQuery = Category.find(query)
      .populate('parent', 'name _id')
      .sort({ order: 1, name: 1 });
    
    // Add pagination for list format
    if (format === 'list' && page && limit) {
      const skip = (page - 1) * limit;
      dbQuery = dbQuery.skip(skip).limit(limit);
    }
    
    const categories = await dbQuery;
    return categories;
  } catch (error) {
    logger.error('Database query failed for categories', {
      error: error.message,
      query,
      options,
      stack: error.stack
    });
    
    // Handle specific database errors
    if (error.name === 'MongoNetworkError' || error.name === 'MongoServerSelectionError') {
      throw new AppError('Database connection failed. Please try again later.', 503);
    }
    
    throw new AppError('Failed to fetch categories from database', 500);
  }
};

exports.createCategory = asyncHandler(async (req, res) => {
  let { name, description, parent, isActive = true, order = 0 } = req.body;
  
  // Get image URL from S3 upload
  const image = req.file ? req.file.location : '';
  
  // Check if parent exists if provided
  if (parent) {
    const parentCategory = await Category.findById(parent);
    if (!parentCategory) {
      // Delete uploaded file from S3 if category creation fails
      if (req.file && s3Config.hasS3Config) {
        try {
          await s3Config.s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: req.file.key
          }));
        } catch (error) {
          logger.error('Error deleting file from S3:', error);
        }
      }
      throw new AppError('Parent category not found', 400);
    }
  }

  // If this is a parent category (no parent), assign next available order
  if (!parent) {
    const maxOrderParent = await Category.findOne({ parent: null }).sort({ order: -1 });
    order = maxOrderParent ? maxOrderParent.order + 1 : 1;
  } else {
    // For child categories, order is always 0
    order = 0;
  }

  const category = new Category({
    name,
    description,
    parent,
    image,
    isActive,
    order
  });

  // Save the category (this will validate that image is required)
  try {
    await category.save();
  } catch (error) {
    // If validation fails due to missing image, delete uploaded file from S3
    if (error.name === 'ValidationError' && error.errors && error.errors.image) {
      if (req.file && s3Config.hasS3Config) {
        try {
          await s3Config.s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: req.file.key
          }));
        } catch (s3Error) {
          logger.error('Error deleting file from S3:', s3Error);
        }
      }
      throw new ValidationError('Image is required');
    }
    throw error;
  }
  
  // Populate parent if exists
  if (parent) {
    await category.populate('parent');
  }

  // Clear cache when new category is created
  clearCategoryCache('new category created');

  res.status(201).json({
    success: true,
    data: category,
    message: 'Category created successfully'
  });
});

exports.getCategories = asyncHandler(async (req, res) => {
  const { format = 'list', isActive, page, limit } = req.query;
  
  // Validate query parameters
  validateGetCategoriesQuery(req.query);
  
  // Build query object
  let query = {};
  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  // Check cache first (only for non-paginated requests)
  const useCache = !page && !limit && format === 'list';
  if (useCache) {
    const cachedData = categoryCache.get();
    if (cachedData) {
      logger.info('Categories served from cache');
      return res.json({
        success: true,
        data: cachedData,
        count: cachedData.length,
        message: 'Categories retrieved successfully (cached)',
        cached: true
      });
    }
  }

  // Fetch from database
  const categories = await fetchCategoriesFromDB(query, { page, limit, format });
  
  // Cache the results for list format without pagination
  if (useCache) {
    categoryCache.set(categories);
    logger.info('Categories cached for future requests');
  }

  // Handle tree format
  if (format === 'tree') {
    const treeData = buildCategoryTree(categories);
    const treeNodes = treeData.map(convertToTreeNode);
    
    return res.json({
      success: true,
      data: treeNodes,
      message: 'Categories retrieved successfully'
    });
  }

  // Handle list format with pagination
  let response = {
    success: true,
    data: categories,
    count: categories.length,
    message: 'Categories retrieved successfully'
  };

  // Add pagination metadata if pagination is used
  if (page && limit) {
    const totalCount = await Category.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);
    
    response.pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      totalCount,
      totalPages,
      hasNext: parseInt(page) < totalPages,
      hasPrev: parseInt(page) > 1
    };
  }

  res.json(response);
});

exports.getCategoryById = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id)
    .populate('parent', 'name _id')
    .populate('children', 'name _id isActive order');
  
  if (!category) {
    throw new AppError('Category not found', 404);
  }
  
  res.json({
    success: true,
    data: category,
    message: 'Category retrieved successfully'
  });
});

exports.updateCategory = asyncHandler(async (req, res) => {
  const { name, description, parent, isActive, order } = req.body;
  
  // Get image URL from S3 upload if a new image was provided
  const newImage = req.file ? req.file.location : undefined;
  
  // Check if parent exists if provided
  if (parent) {
    const parentCategory = await Category.findById(parent);
    if (!parentCategory) {
      // Delete uploaded file from S3 if category update fails
      if (req.file && s3Config.hasS3Config) {
        try {
          await s3Config.s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: req.file.key
          }));
        } catch (error) {
          logger.error('Error deleting file from S3:', error);
        }
      }
      throw new AppError('Parent category not found', 400);
    }
    
    // Prevent circular reference
    if (parent === req.params.id) {
      // Delete uploaded file from S3 if category update fails
      if (req.file && s3Config.hasS3Config) {
        try {
          await s3Config.s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: req.file.key
          }));
        } catch (error) {
          logger.error('Error deleting file from S3:', error);
        }
      }
      throw new AppError('Category cannot be its own parent', 400);
    }
  }

  // Get existing category to check if we need to delete old image
  const existingCategory = await Category.findById(req.params.id);
  if (!existingCategory) {
    // Delete uploaded file from S3 if category doesn't exist
    if (req.file && s3Config.hasS3Config) {
      try {
        await s3Config.s3Client.send(new DeleteObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: req.file.key
        }));
      } catch (error) {
        logger.error('Error deleting file from S3:', error);
      }
    }
    throw new AppError('Category not found', 404);
  }

  const updateData = { name, description, parent, isActive, order };
  
  // If a new image was uploaded, update the image field and delete the old image
  if (newImage) {
    updateData.image = newImage;
    
    // Delete old image from S3 if it exists and S3 is configured
    if (existingCategory.image && s3Config.hasS3Config) {
      try {
        // Extract the key from the S3 URL
        const key = existingCategory.image.split('/').slice(3).join('/');
        
        await s3Config.s3Client.send(new DeleteObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: key
        }));
      } catch (error) {
        logger.error('Error deleting old image from S3:', error);
      }
    }
  } else if (req.file) {
    // If a file was uploaded but we're not using it (shouldn't happen but just in case)
    updateData.image = req.file.location;
  }

  const category = await Category.findByIdAndUpdate(
    req.params.id, 
    updateData,
    { new: true, runValidators: true }
  ).populate('parent', 'name _id');

  // Clear cache when category is updated
  clearCategoryCache('category updated');

  res.json({
    success: true,
    data: category,
    message: 'Category updated successfully'
  });
});

exports.deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    throw new AppError('Category not found', 404);
  }

  // Check if category has children
  const childrenCount = await Category.countDocuments({ parent: req.params.id });
  if (childrenCount > 0) {
    throw new AppError('Cannot delete category with subcategories. Please delete subcategories first.', 400);
  }

  // Delete image from S3 if it exists and S3 is configured
  if (category.image && s3Config.hasS3Config) {
    try {
      // Extract the key from the S3 URL
      const key = category.image.split('/').slice(3).join('/');
      
      await s3Config.s3Client.send(new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key
      }));
    } catch (error) {
      logger.error('Error deleting image from S3:', error);
      // Continue with category deletion even if S3 deletion fails
    }
  }

  await Category.findByIdAndDelete(req.params.id);
  
  // Clear cache when category is deleted
  clearCategoryCache('category deleted');
  
  res.json({ 
    success: true,
    message: 'Category deleted successfully' 
  });
});

exports.toggleStatus = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    throw new AppError('Category not found', 404);
  }

  const newStatus = !category.isActive;
  category.isActive = newStatus;
  await category.save();

  // If deactivating a category, deactivate all its descendants
  if (!newStatus) {
    await deactivateDescendants(req.params.id);
  } else {
    // If activating a category, check if its parent is active
    // If parent is inactive, don't activate this category
    if (category.parent) {
      const parentCategory = await Category.findById(category.parent);
      if (parentCategory && !parentCategory.isActive) {
        category.isActive = false;
        await category.save();
        throw new AppError('Cannot activate category because its parent is inactive', 400);
      }
    }
    // If activating and parent is active, activate all descendants that have active parents
    await activateDescendants(req.params.id);
  }

  // Clear cache when status is toggled
  clearCategoryCache('category status toggled');

  res.json({
    success: true,
    data: category,
    message: `Category ${category.isActive ? 'activated' : 'deactivated'} successfully`
  });
});

// Helper function to deactivate all descendants of a category
const deactivateDescendants = async (categoryId) => {
  const children = await Category.find({ parent: categoryId });
  
  for (const child of children) {
    child.isActive = false;
    await child.save();
    // Recursively deactivate children of this child
    await deactivateDescendants(child._id);
  }
};

// Helper function to activate descendants that have active parents
const activateDescendants = async (categoryId) => {
  const children = await Category.find({ parent: categoryId });
  
  for (const child of children) {
    // Check if this child's parent (the current category) is active
    const parentCategory = await Category.findById(categoryId);
    if (parentCategory && parentCategory.isActive) {
      child.isActive = true;
      await child.save();
      // Recursively activate children of this child
      await activateDescendants(child._id);
    }
  }
};

exports.updateOrder = asyncHandler(async (req, res) => {
  const { categories } = req.body;

  if (!Array.isArray(categories)) {
    throw new ValidationError('Categories array is required');
  }

  // Validate each category object
  for (const category of categories) {
    if (!category.id || !Number.isInteger(+category.order)) {
      throw new ValidationError('Each category must have a valid id and order');
    }
  }

  // Update each category's order
  const updatePromises = categories.map(({ id, order }) => 
    Category.findByIdAndUpdate(id, { order }, { new: true })
  );

  const updatedCategories = await Promise.all(updatePromises);

  // Clear cache when order is updated
  clearCategoryCache('category order updated');

  res.json({
    success: true,
    data: updatedCategories,
    message: 'Category order updated successfully'
  });
});

exports.bulkUpdate = asyncHandler(async (req, res) => {
  const { categories } = req.body;
  
  if (!Array.isArray(categories)) {
    throw new ValidationError('Categories array is required');
  }

  // Validate each category object
  for (const category of categories) {
    if (!category.id) {
      throw new ValidationError('Each category must have a valid id');
    }
  }

  const updatePromises = categories.map(category => 
    Category.findByIdAndUpdate(category.id, category, { new: true, runValidators: true })
  );

  const updatedCategories = await Promise.all(updatePromises);

  // Clear cache when categories are bulk updated
  clearCategoryCache('categories bulk updated');

  res.json({
    success: true,
    data: updatedCategories,
    message: 'Categories updated successfully'
  });
}); 

exports.getCategoriesTree = asyncHandler(async (req, res) => {
  // Optionally filter only active categories
  const categories = await Category.find({ isActive: true }).sort({ order: 1, name: 1 });
  const tree = buildCategoryTree(categories);
  // Convert to tree node format for frontend tree components
  const treeNodes = tree.map(convertToTreeNode);
  res.json(treeNodes);
}); 

// Sample category tree for frontend demo/testing
exports.getCategoriesSampleTree = (req, res) => {
  const nodes = Array.from({ length: 10 }, (_, i) => ({
    key: `${i}`,
    label: `Category ${i + 1}`,
    children: Array.from({ length: 4 }, (_, j) => ({
      key: `${i}-${j}`,
      label: `Item ${i + 1}.${j + 1}`
    }))
  }));
  res.json(nodes);
}; 

exports.getCategoriesFrontendTree = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true }).sort({ order: 1, name: 1 });
  const tree = buildCategoryTree(categories);
  const frontendTree = tree.map(convertToFrontendTreeNode);
  res.json({
    success: true,
    data: frontendTree,
    count: frontendTree.length,
    message: 'Frontend category tree retrieved successfully'
  });
});

exports.getParentCategories = asyncHandler(async (req, res) => {
  const { isActive } = req.query;
  
  // Build query object for parent categories only
  // Default to only active categories unless explicitly requested otherwise
  let query = { parent: null, isActive: true };
  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  try {
    const parentCategories = await Category.find(query)
      .populate('parent', 'name _id')
      .sort({ order: 1, name: 1 });

    res.json({
      success: true,
      data: parentCategories,
      count: parentCategories.length,
      message: 'Parent categories retrieved successfully'
    });
  } catch (error) {
    logger.error('Database query failed for parent categories', {
      error: error.message,
      query,
      stack: error.stack
    });
    
    // Handle specific database errors
    if (error.name === 'MongoNetworkError' || error.name === 'MongoServerSelectionError') {
      throw new AppError('Database connection failed. Please try again later.', 503);
    }
    
    throw new AppError('Failed to fetch parent categories from database', 500);
  }
});