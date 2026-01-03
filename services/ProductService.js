const Product = require('../models/Product');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const Attribute = require('../models/Attribute');
const { NotFoundError, ValidationError, ConflictError } = require('../middleware/errorHandler');
const { logger } = require('../middleware/logger');
const mongoose = require('mongoose');

/**
 * Product Service - Handles all product-related business logic
 */
class ProductService {
  /**
   * Helper function to safely parse JSON fields
   * @param {string|object} data - Data to parse
   * @param {string} fieldName - Name of the field for error reporting
   * @returns {object|array|null} Parsed data or original if already parsed
   */
  safeJsonParse(data, fieldName) {
    if (!data) return null;
    if (typeof data === 'object') return data;
    
    try {
      return JSON.parse(data);
    } catch (error) {
      logger.warn(`Failed to parse JSON field: ${fieldName}`, { data, error: error.message });
      throw new ValidationError(`Invalid JSON format for field: ${fieldName}`);
    }
  }

  /**
   * Helper function to process file uploads
   * @param {object} files - Request files object
   * @returns {object} Processed file data
   */
  processFileUploads(files) {
    // Handle S3 uploads - multer-s3 provides 'location' property with full URL
    // For local uploads, 'filename' property is used
    const getFileUrl = (file) => {
      if (!file) return '';
      
      // Log file structure for debugging
      logger.info('Processing file upload', {
        hasLocation: !!file.location,
        hasFilename: !!file.filename,
        hasKey: !!file.key,
        fileField: file.fieldname,
        originalName: file.originalname
      });
      
      // S3 uploads have 'location' property with full URL
      if (file.location) {
        logger.info('Using S3 location URL', { location: file.location });
        return file.location;
      }
      // Local uploads have 'filename' property
      if (file.filename) {
        logger.info('Using local filename', { filename: file.filename });
        return file.filename;
      }
      
      logger.warn('No valid file URL found', { file: file });
      return '';
    };

    const result = {
      mainImage: getFileUrl(files?.mainImage?.[0]) || '',
      otherImages: files?.otherImages?.map(f => getFileUrl(f)).filter(url => url) || [],
      specificationsFile: getFileUrl(files?.specificationsFile?.[0]) || ''
    };

    logger.info('Processed file uploads', {
      mainImage: result.mainImage,
      otherImagesCount: result.otherImages.length,
      specificationsFile: result.specificationsFile
    });

    return result;
  }

  /**
   * Helper function to normalize boolean values from form data
   * @param {any} value - Value to normalize
   * @returns {boolean|null} Normalized boolean or null if not a boolean field
   */
  normalizeBoolean(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lower = value.toLowerCase().trim();
      if (lower === 'true' || lower === '1' || lower === 'yes') return true;
      if (lower === 'false' || lower === '0' || lower === 'no' || lower === '') return false;
    }
    if (typeof value === 'number') return value !== 0;
    return null;
  }

  /**
   * Helper function to process product data
   * @param {object} data - Request body data
   * @returns {object} Processed product data
   */
  processProductData(data) {
    const processed = {
      attributes: this.safeJsonParse(data.attributes, 'attributes'),
      quantityLevels: this.safeJsonParse(data.quantityLevels, 'quantityLevels'),
      parcel: this.safeJsonParse(data.parcel, 'parcel'),
      additionalFields: this.safeJsonParse(data.additionalFields, 'additionalFields'),
      meta: this.safeJsonParse(data.meta, 'meta')
    };

    // Handle categories array (ensure it's an array of ObjectIds)
    if (data.categories) {
      if (typeof data.categories === 'string') {
        try {
          // Try to parse as JSON first
          processed.categories = JSON.parse(data.categories);
        } catch (e) {
          // If not JSON, treat as comma-separated string
          processed.categories = data.categories.split(',').map(cat => cat.trim()).filter(cat => cat);
        }
      } else if (Array.isArray(data.categories)) {
        // Clean up array elements (trim whitespace)
        processed.categories = data.categories.map(cat => typeof cat === 'string' ? cat.trim() : cat).filter(cat => cat);
      }
    }

    // Handle dimensions object
    if (data.dimensions) {
      if (typeof data.dimensions === 'string') {
        processed.dimensions = this.safeJsonParse(data.dimensions, 'dimensions');
      } else if (typeof data.dimensions === 'object') {
        processed.dimensions = data.dimensions;
      }
    }

    return processed;
  }

  /**
   * Helper function to enrich product attributes with attribute names
   * @param {object|Array} products - Single product object or array of products
   * @returns {Promise<object|Array>} Product(s) with enriched attributes
   */
  async enrichAttributesWithNames(products) {
    const isArray = Array.isArray(products);
    const productList = isArray ? products : [products];
    
    // Collect all unique attribute IDs
    const attributeIds = new Set();
    productList.forEach(product => {
      if (product.attributes && Array.isArray(product.attributes)) {
        product.attributes.forEach(attr => {
          if (attr.id) {
            attributeIds.add(attr.id);
          }
        });
      }
    });

    // Fetch all attributes in one query
    const attributesMap = new Map();
    if (attributeIds.size > 0) {
      // Convert string IDs to ObjectIds for querying
      const objectIds = Array.from(attributeIds)
        .filter(id => mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(id));

      if (objectIds.length > 0) {
        const attributes = await Attribute.find({
          _id: { $in: objectIds }
        }).select('_id name').lean();
        
        attributes.forEach(attr => {
          // Store with string format for lookup (since product attributes use string IDs)
          attributesMap.set(attr._id.toString(), attr.name);
        });
      }
    }

    // Enrich attributes with names
    productList.forEach(product => {
      if (product.attributes && Array.isArray(product.attributes)) {
        product.attributes = product.attributes.map(attr => ({
          ...attr,
          name: attributesMap.get(attr.id) || null
        }));
      }
    });

    return isArray ? productList : productList[0];
  }

  /**
   * Get full category hierarchy path for a category
   * @param {string} categoryId - Category ID
   * @returns {Promise<Array>} Array of category hierarchy from root to leaf
   */
  async getCategoryHierarchy(categoryId) {
    const hierarchy = [];
    let currentCategory = await Category.findById(categoryId).populate('parent');
    
    while (currentCategory) {
      hierarchy.unshift({
        id: currentCategory._id,
        name: currentCategory.name,
        slug: currentCategory.slug,
        isActive: currentCategory.isActive
      });
      
      currentCategory = currentCategory.parent;
    }
    
    return hierarchy;
  }

  /**
   * Validate categories and brand exist (supports nth level nested categories)
   * @param {Array} categoryIds - Array of category IDs
   * @param {string} brandId - Brand ID
   * @returns {Promise<object>} Validation result
   */
  async validateCategoriesAndBrand(categoryIds, brandId) {
    const validationPromises = [];
    
    // Validate categories exist (supports nested categories)
    if (categoryIds && categoryIds.length > 0) {
      validationPromises.push(
        Category.find({ _id: { $in: categoryIds } })
          .populate('parent', 'name isActive') // Populate parent to check hierarchy
          .then(categories => {
            if (categories.length !== categoryIds.length) {
              const foundIds = categories.map(c => c._id.toString());
              const missingIds = categoryIds.filter(id => !foundIds.includes(id.toString()));
              
              // Log for debugging
              logger.error('Category validation failed', {
                requestedIds: categoryIds,
                foundIds: foundIds,
                missingIds: missingIds,
                foundCategories: categories.map(c => ({ 
                  id: c._id, 
                  name: c.name, 
                  isActive: c.isActive,
                  parent: c.parent ? { id: c.parent._id, name: c.parent.name, isActive: c.parent.isActive } : null
                }))
              });
              
              throw new ValidationError(`Categories not found in database: ${missingIds.join(', ')}. Please check if these category IDs exist.`);
            }
            
            // Check if any categories are inactive (Category model uses isActive field)
            const inactiveCategories = categories.filter(c => !c.isActive);
            if (inactiveCategories.length > 0) {
              const inactiveIds = inactiveCategories.map(c => `${c.name} (${c._id})`);
              throw new ValidationError(`Inactive categories: ${inactiveIds.join(', ')}. Please use active categories only.`);
            }
            
            // Check if any parent categories are inactive (for nested categories)
            const categoriesWithInactiveParents = categories.filter(c => c.parent && !c.parent.isActive);
            if (categoriesWithInactiveParents.length > 0) {
              const invalidIds = categoriesWithInactiveParents.map(c => `${c.name} (parent: ${c.parent.name} is inactive)`);
              throw new ValidationError(`Categories with inactive parents: ${invalidIds.join(', ')}. Parent categories must be active.`);
            }
            
            return categories;
          })
      );
    }
    
    // Validate brand exists
    if (brandId) {
      validationPromises.push(
        Brand.findOne({ _id: brandId })
          .then(brand => {
            if (!brand) {
              logger.error('Brand validation failed', {
                requestedBrandId: brandId,
                message: 'Brand not found in database'
              });
              throw new ValidationError(`Brand not found in database: ${brandId}. Please check if this brand ID exists.`);
            }
            
            if (!brand.isActive) {
              throw new ValidationError(`Inactive brand: ${brandId}. Please use an active brand.`);
            }
            
            return brand;
          })
      );
    }
    
    const [categories, brand] = await Promise.all(validationPromises);
    return { categories, brand };
  }

  /**
   * Check SKU uniqueness
   * @param {string} sku - SKU to check
   * @param {string} excludeId - Product ID to exclude from check (for updates)
   * @returns {Promise<void>}
   */
  async checkSkuUniqueness(sku, excludeId = null) {
    const query = { sku: sku.toUpperCase() };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    
    const existingProduct = await Product.findOne(query);
    if (existingProduct) {
      throw new ConflictError(`Product with SKU '${sku}' already exists`);
    }
  }

  /**
   * Create a new product
   * @param {object} productData - Product data
   * @param {object} files - Uploaded files
   * @param {string} userId - User ID creating the product
   * @returns {object} Created product
   */
  async createProduct(productData, files, userId) {
    // Log product creation attempt (without sensitive data)
    logger.info('Product creation attempt', {
      userId,
      hasFiles: !!files,
      productName: productData.productName,
      categoriesType: typeof productData.categories,
      categoriesValue: productData.categories,
      categoriesLength: Array.isArray(productData.categories) ? productData.categories.length : 'not array'
    });

    // Validate required fields
    if (!productData.productName) {
      throw new ValidationError('Product name is required');
    }
    if (!productData.sku) {
      throw new ValidationError('SKU is required');
    }
    if (!productData.price || productData.price <= 0) {
      throw new ValidationError('Valid price is required');
    }
    if (!productData.categories || (Array.isArray(productData.categories) && productData.categories.length === 0)) {
      throw new ValidationError('At least one category is required');
    }
    if (!productData.brandId) {
      throw new ValidationError('Brand is required');
    }

    // Check SKU uniqueness
    await this.checkSkuUniqueness(productData.sku);

    // Validate categories and brand exist
    await this.validateCategoriesAndBrand(productData.categories, productData.brandId);

    // Process file uploads
    const fileData = this.processFileUploads(files);
    
    // Process JSON fields
    const processedData = this.processProductData(productData);

    // Normalize boolean fields (handle string booleans from form data)
    const normalizedBooleans = {};
    if (productData.isDeliveryAvailable !== undefined) {
      const normalized = this.normalizeBoolean(productData.isDeliveryAvailable);
      if (normalized !== null) {
        normalizedBooleans.isDeliveryAvailable = normalized;
      }
    }

    // Create product with processed data
    const finalProductData = {
      ...productData,
      ...fileData,
      ...processedData,
      ...normalizedBooleans,
      sku: productData.sku.toUpperCase(),
      createdBy: userId,
      updatedBy: userId
    };

    // Ensure categories is properly set (override if processed data has categories)
    if (processedData.categories) {
      finalProductData.categories = processedData.categories;
    }

    const product = new Product(finalProductData);
    await product.save();

    // Populate the created product
    await product.populate([
      { path: 'categories', select: 'name description' },
      { path: 'brandId', select: 'name description' },
      { path: 'createdBy', select: 'firstName lastName username' },
      { path: 'updatedBy', select: 'firstName lastName username' }
    ]);

    logger.info('Product created successfully', {
      productId: product._id,
      userId,
      productName: product.productName,
      sku: product.sku
    });

    // Convert to plain object and enrich attributes with names
    const productObj = product.toObject();
    return await this.enrichAttributesWithNames(productObj);
  }

  /**
   * Get all products with filtering and sorting
   * @param {object} options - Query options
   * @returns {object} Products
   */
  async getProducts(options = {}) {
    const {
      sort = '-createdAt',
      categories,
      brandId,
      minPrice,
      maxPrice,
      search,
      status = 'active',
      stockStatus,
      isPublished,
      isLowStock,
      includeDeleted,
      deletedOnly
    } = options;

    // Build filter object
    const filter = {};
    
    // Status and deletion filters
    // deletedOnly overrides other deletion filters
    if (deletedOnly === true || deletedOnly === 'true') {
      filter.deletedAt = { $exists: true };
    } else if (includeDeleted === true || includeDeleted === 'true') {
      // Include both deleted and non-deleted: do not add deletedAt filter
    } else {
      // Default: exclude deleted
      filter.deletedAt = { $exists: false };
    }

    // Status filter (when status is provided)
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    // Category filter (support multiple categories)
    if (categories) {
      const categoryArray = Array.isArray(categories) ? categories : [categories];
      filter.categories = { $in: categoryArray };
    }
    
    // Brand filter
    if (brandId) {
      filter.brandId = brandId;
    }
    
    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    
    // Stock status filter
    if (stockStatus) {
      filter.stockStatus = stockStatus;
    }
    
    // Published filter
    if (isPublished !== undefined) {
      filter.isPublished = isPublished === 'true' || isPublished === true;
    }
    
    // Low stock filter
    if (isLowStock === 'true' || isLowStock === true) {
      filter.$expr = {
        $and: [
          { $eq: ['$trackQuantity', true] },
          { $lte: ['$stock', '$lowStockThreshold'] }
        ]
      };
    }
    
    // Search filter
    if (search) {
      filter.$or = [
        { productName: { $regex: search, $options: 'i' } },
        { shortDescription: { $regex: search, $options: 'i' } },
        { longDescription: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { seller: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Execute query with population
    const products = await Product.find(filter)
      .populate('brandId', 'name description')
      .populate('categories', 'name description')
      .populate('createdBy', 'firstName lastName username')
      .populate('updatedBy', 'firstName lastName username')
      .sort(sort)
      .lean();

    // Enrich attributes with names
    const enrichedProducts = await this.enrichAttributesWithNames(products);

    return {
      products: enrichedProducts
    };
  }

  /**
   * Get product by ID
   * @param {string} productId - Product ID
   * @param {boolean} includeDeleted - Include deleted products
   * @returns {object} Product object with related products
   */
  async getProductById(productId, includeDeleted = false) {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new ValidationError('Invalid product ID format');
    }

    const filter = { _id: productId };
    if (!includeDeleted) {
      filter.deletedAt = { $exists: false };
    }

    const product = await Product.findOne(filter)
      .populate('brandId', 'name description')
      .populate('categories', 'name description')
      .populate('createdBy', 'firstName lastName username')
      .populate('updatedBy', 'firstName lastName username')
      .lean();

    if (!product) {
      throw new NotFoundError('Product');
    }

    // Enrich attributes with names
    const enrichedProduct = await this.enrichAttributesWithNames(product);

    // Get related products from the same category(ies)
    // Fetch related products if product has categories (regardless of product status)
    if (product.categories && product.categories.length > 0) {
      // Extract category IDs properly (handle both populated objects and ObjectIds)
      const categoryIds = product.categories.map(cat => {
        let categoryId = null;
        
        // Handle populated category objects
        if (typeof cat === 'object' && cat !== null) {
          if (cat._id) {
            categoryId = cat._id;
          } else if (cat.toString) {
            // It's already an ObjectId
            categoryId = cat;
          }
        } else {
          // It's a string or ObjectId directly
          categoryId = cat;
        }
        
        // Convert to ObjectId if it's a valid string
        if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
          // If it's already an ObjectId instance, return as is, otherwise convert
          if (categoryId instanceof mongoose.Types.ObjectId) {
            return categoryId;
          }
          return new mongoose.Types.ObjectId(categoryId);
        }
        
        return categoryId;
      }).filter(id => id && mongoose.Types.ObjectId.isValid(id)); // Remove any null/undefined/invalid values

      logger.info('Fetching related products', {
        productId,
        categoryIds: categoryIds.map(id => id.toString()),
        categoryCount: categoryIds.length
      });

      // Find products that share at least one category with the current product
      const relatedProducts = await Product.find({
        _id: { $ne: new mongoose.Types.ObjectId(productId) }, // Exclude current product
        categories: { $in: categoryIds }, // Products with matching category(ies)
        status: 'active', // Only active products
        isPublished: true, // Only published products
        deletedAt: { $exists: false } // Not deleted
      })
        .select('productName sku price comparePrice mainImage shortDescription status isPublished brandId categories')
        .populate('brandId', 'name description')
        .populate('categories', 'name description')
        .sort('-createdAt') // Sort by newest first
        .limit(5) // Limit to 5 products
        .lean();

      logger.info('Related products found', {
        productId,
        relatedProductsCount: relatedProducts.length
      });

      // Enrich related products attributes with names
      const enrichedRelatedProducts = await this.enrichAttributesWithNames(relatedProducts);

      // Add related products to the response
      enrichedProduct.relatedProducts = enrichedRelatedProducts;
    } else {
      // If product has no categories, return empty related products
      enrichedProduct.relatedProducts = [];
      logger.info('No related products - product has no categories', {
        productId,
        hasCategories: !!(product.categories && product.categories.length > 0)
      });
    }

    return enrichedProduct;
  }

  /**
   * Update product by ID
   * @param {string} productId - Product ID
   * @param {object} updateData - Data to update
   * @param {object} files - Uploaded files
   * @param {string} userId - User ID updating the product
   * @returns {object} Updated product
   */
  async updateProduct(productId, updateData, files, userId) {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new ValidationError('Invalid product ID format');
    }

    // Check if product exists and is not deleted
    const existingProduct = await Product.findOne({ 
      _id: productId, 
      deletedAt: { $exists: false } 
    });
    if (!existingProduct) {
      throw new NotFoundError('Product');
    }

    logger.info('Product update attempt', {
      productId,
      userId,
      hasFiles: !!files,
      updateFields: Object.keys(updateData)
    });

    // Check SKU uniqueness if SKU is being updated
    if (updateData.sku && updateData.sku !== existingProduct.sku) {
      await this.checkSkuUniqueness(updateData.sku, productId);
    }

    // Validate categories and brand if they are being updated
    if (updateData.categories || updateData.brandId) {
      await this.validateCategoriesAndBrand(
        updateData.categories || existingProduct.categories,
        updateData.brandId || existingProduct.brandId
      );
    }

    // Process file uploads (only include if files are provided)
    const fileData = {};
    
    // Helper function to get file URL (S3 or local)
    const getFileUrl = (file) => {
      if (!file) return '';
      // S3 uploads have 'location' property with full URL
      if (file.location) {
        return file.location;
      }
      // Local uploads have 'filename' property
      if (file.filename) {
        return file.filename;
      }
      return '';
    };

    if (files?.mainImage?.[0]) {
      fileData.mainImage = getFileUrl(files.mainImage[0]);
    }
    if (files?.otherImages?.length > 0) {
      fileData.otherImages = files.otherImages.map(f => getFileUrl(f)).filter(url => url);
    }
    if (files?.specificationsFile?.[0]) {
      fileData.specificationsFile = getFileUrl(files.specificationsFile[0]);
    }
    if (files?.image360Url?.[0]) {
      fileData.image360Url = getFileUrl(files.image360Url[0]);
    }

    // Process JSON fields using the helper method
    const processedData = this.processProductData(updateData);

    // Normalize boolean fields (handle string booleans from form data)
    const normalizedBooleans = {};
    if (updateData.isDeliveryAvailable !== undefined) {
      const normalized = this.normalizeBoolean(updateData.isDeliveryAvailable);
      if (normalized !== null) {
        normalizedBooleans.isDeliveryAvailable = normalized;
      }
    }

    // Build update object
    const finalUpdateData = {
      ...updateData,
      ...fileData,
      ...processedData,
      ...normalizedBooleans,
      updatedBy: userId,
      updatedAt: new Date()
    };

    // Ensure SKU is uppercase if provided
    if (finalUpdateData.sku) {
      finalUpdateData.sku = finalUpdateData.sku.toUpperCase();
    }

    const product = await Product.findByIdAndUpdate(
      productId,
      finalUpdateData,
      { 
        new: true, 
        runValidators: true 
      }
    ).populate([
      { path: 'brandId', select: 'name description' },
      { path: 'categories', select: 'name description' },
      { path: 'createdBy', select: 'firstName lastName username' },
      { path: 'updatedBy', select: 'firstName lastName username' }
    ]);

    logger.info('Product updated successfully', {
      productId: product._id,
      userId,
      productName: product.productName,
      sku: product.sku
    });

    // Convert to plain object and enrich attributes with names
    const productObj = product.toObject();
    return await this.enrichAttributesWithNames(productObj);
  }

  /**
   * Delete product by ID (soft delete)
   * @param {string} productId - Product ID
   * @param {string} userId - User ID deleting the product
   * @returns {object} Deletion result
   */
  async deleteProduct(productId, userId) {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new ValidationError('Invalid product ID format');
    }

    // Find product regardless of deleted state to support idempotent deletes
    const product = await Product.findById(productId);
    
    if (!product) {
      throw new NotFoundError('Product');
    }

    // If already soft-deleted, treat as idempotent success
    if (product.deletedAt) {
      logger.info('Product delete noop - already deleted', {
        productId,
        userId,
        productName: product.productName,
        sku: product.sku
      });
      return { 
        productId, 
        productName: product.productName, 
        sku: product.sku,
        alreadyDeleted: true
      };
    }

    // Soft delete by updating status and setting deletion fields
    await Product.findByIdAndUpdate(productId, {
      status: 'archived',
      deletedAt: new Date(),
      deletedBy: userId
    });

    logger.info('Product deleted successfully', {
      productId,
      userId,
      productName: product.productName,
      sku: product.sku
    });

    return { 
      productId, 
      productName: product.productName, 
      sku: product.sku 
    };
  }

  /**
   * Get category tree structure with product counts
   * @param {string} parentId - Parent category ID (null for root categories)
   * @returns {Promise<Array>} Category tree with product counts
   */
  async getCategoryTree(parentId = null) {
    const categories = await Category.find({ 
      parent: parentId, 
      isActive: true 
    }).sort({ order: 1, name: 1 });
    
    const categoryTree = [];
    
    for (const category of categories) {
      // Get product count for this category and all its subcategories
      const subcategoryIds = await this.getAllSubcategoryIds(category._id.toString());
      const productCount = await Product.countDocuments({
        categories: { $in: subcategoryIds },
        status: 'active',
        deletedAt: { $exists: false }
      });
      
      // Recursively get children
      const children = await this.getCategoryTree(category._id);
      
      categoryTree.push({
        id: category._id,
        name: category.name,
        description: category.description,
        slug: category.slug,
        image: category.image,
        order: category.order,
        productCount: productCount,
        hasChildren: children.length > 0,
        children: children
      });
    }
    
    return categoryTree;
  }

  /**
   * Get all subcategory IDs for a given category (recursive)
   * @param {string} categoryId - Parent category ID
   * @returns {Promise<Array>} Array of all subcategory IDs including the parent
   */
  async getAllSubcategoryIds(categoryId) {
    const subcategoryIds = [categoryId];
    
    const getChildren = async (parentId) => {
      const children = await Category.find({ parent: parentId, isActive: true }).select('_id');
      for (const child of children) {
        subcategoryIds.push(child._id.toString());
        await getChildren(child._id); // Recursive call for nested children
      }
    };
    
    await getChildren(categoryId);
    return subcategoryIds;
  }

  /**
   * Get products by category (includes products from all subcategories)
   * @param {string} categoryId - Category ID
   * @param {object} options - Query options
   * @returns {object} Products
   */
  async getProductsByCategory(categoryId, options = {}) {
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      throw new ValidationError('Invalid category ID format');
    }

    const { 
      sort = '-createdAt', 
      status = 'active',
      includeSubcategories = true // New option to include subcategories
    } = options;

    logger.info('Getting products by category', {
      categoryId,
      options: { sort, status, includeSubcategories }
    });
    
    // Get all category IDs to search (including subcategories if requested)
    let categoryIds = [categoryId];
    if (includeSubcategories) {
      categoryIds = await this.getAllSubcategoryIds(categoryId);
    }
    
    const filter = { 
      categories: { $in: categoryIds },
      deletedAt: { $exists: false }
    };
    
    if (status !== 'all') {
      filter.status = status;
    }

    try {
      const products = await Product.find(filter)
        .populate('brandId', 'name description')
        .populate('categories', 'name description parent slug')
        .sort(sort)
        .lean();

      // Enrich attributes with names
      const enrichedProducts = await this.enrichAttributesWithNames(products);

      logger.info('Products retrieved by category', {
        categoryId,
        categoryIds,
        productCount: enrichedProducts.length
      });

      return {
        products: enrichedProducts,
        categoryIds: categoryIds // Return which categories were searched
      };
    } catch (error) {
      logger.error('Error getting products by category', {
        categoryId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get products by brand
   * @param {string} brandId - Brand ID
   * @param {object} options - Query options
   * @returns {object} Products
   */
  async getProductsByBrand(brandId, options = {}) {
    if (!mongoose.Types.ObjectId.isValid(brandId)) {
      throw new ValidationError('Invalid brand ID format');
    }

    const { sort = '-createdAt', status = 'active' } = options;

    const filter = { 
      brandId: brandId,
      deletedAt: { $exists: false }
    };
    
    if (status !== 'all') {
      filter.status = status;
    }

    const products = await Product.find(filter)
      .populate('brandId', 'name description')
      .populate('categories', 'name description')
      .sort(sort)
      .lean();

    // Enrich attributes with names
    const enrichedProducts = await this.enrichAttributesWithNames(products);

    return {
      products: enrichedProducts
    };
  }

  /**
   * Get products by category slug
   * @param {string} categorySlug - Category slug
   * @param {object} options - Query options
   * @returns {object} Products
   */
  async getProductsByCategorySlug(categorySlug, options = {}) {
    if (!categorySlug || typeof categorySlug !== 'string') {
      throw new ValidationError('Category slug is required');
    }

    const { 
      sort = '-createdAt', 
      status = 'active',
      includeSubcategories = true,
      fields = null // Comma-separated string of fields to select
    } = options;

    logger.info('Getting products by category slug', {
      categorySlug,
      options: { sort, status, includeSubcategories, fields }
    });

    // First, find the category by slug
    const category = await Category.findOne({ 
      slug: categorySlug, 
      isActive: true 
    });

    if (!category) {
      throw new NotFoundError('Category');
    }
    
    // Get all category IDs to search (including subcategories if requested)
    let categoryIds = [category._id.toString()];
    if (includeSubcategories) {
      categoryIds = await this.getAllSubcategoryIds(category._id.toString());
    }
    
    const filter = { 
      categories: { $in: categoryIds },
      deletedAt: { $exists: false }
    };
    
    if (status !== 'all') {
      filter.status = status;
    }

    try {
      // Build field selection
      let selectFields = {};
      if (fields) {
        const fieldArray = fields.split(',').map(field => field.trim());
        fieldArray.forEach(field => {
          selectFields[field] = 1;
        });
        // Always include _id for reference
        selectFields._id = 1;
      }

      const products = await Product.find(filter)
        .select(selectFields)
        .populate('brandId', 'name description')
        .populate('categories', 'name description parent slug')
        .sort(sort)
        .lean();

      // Enrich attributes with names
      const enrichedProducts = await this.enrichAttributesWithNames(products);

      return {
        products: enrichedProducts,
        category: {
          _id: category._id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          image: category.image,
          parent: category.parent
        },
        categoryIds: categoryIds // Return which categories were searched
      };
    } catch (error) {
      logger.error('Error getting products by category slug', {
        categorySlug,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Bulk update products
   * @param {Array} updates - Array of update objects with id and data
   * @param {string} userId - User ID performing the update
   * @returns {object} Bulk update result
   */
  async bulkUpdateProducts(updates, userId) {
    const results = {
      successful: [],
      failed: []
    };

    for (const update of updates) {
      try {
        const product = await this.updateProduct(update.id, update.data, null, userId);
        results.successful.push({
          id: update.id,
          product: product
        });
      } catch (error) {
        results.failed.push({
          id: update.id,
          error: error.message
        });
      }
    }

    logger.info('Bulk product update completed', {
      userId,
      totalUpdates: updates.length,
      successful: results.successful.length,
      failed: results.failed.length
    });

    return results;
  }

  /**
   * Get product statistics
   * @returns {object} Product statistics
   */
  async getProductStatistics() {
    const [totalProducts, activeProducts, lowStockProducts, outOfStockProducts] = await Promise.all([
      Product.countDocuments({ deletedAt: { $exists: false } }),
      Product.countDocuments({ status: 'active', deletedAt: { $exists: false } }),
      Product.countDocuments({ 
        $expr: {
          $and: [
            { $eq: ['$trackQuantity', true] },
            { $lte: ['$stock', '$lowStockThreshold'] },
            { $gt: ['$stock', 0] }
          ]
        },
        deletedAt: { $exists: false }
      }),
      Product.countDocuments({ 
        stock: 0, 
        trackQuantity: true,
        deletedAt: { $exists: false }
      })
    ]);

    return {
      totalProducts,
      activeProducts,
      inactiveProducts: totalProducts - activeProducts,
      lowStockProducts,
      outOfStockProducts
    };
  }

  /**
   * Duplicate a product
   * @param {string} productId - Product ID to duplicate
   * @param {object} overrides - Fields to override in the duplicate
   * @param {string} userId - User ID creating the duplicate
   * @returns {object} Duplicated product
   */
  async duplicateProduct(productId, overrides = {}, userId) {
    const originalProduct = await this.getProductById(productId);
    
    // Remove fields that shouldn't be duplicated
    const { _id, createdAt, updatedAt, createdBy, updatedBy, ...productData } = originalProduct;
    
    // Generate new SKU if not provided in overrides
    if (!overrides.sku) {
      const timestamp = Date.now().toString().slice(-6);
      overrides.sku = `${productData.sku}-COPY-${timestamp}`;
    }
    
    // Apply overrides
    const duplicateData = {
      ...productData,
      ...overrides,
      productName: overrides.productName || `${productData.productName} (Copy)`
    };
    
    return await this.createProduct(duplicateData, null, userId);
  }

  /**
   * Update product stock
   * @param {string} productId - Product ID
   * @param {number} quantity - New stock quantity
   * @param {string} userId - User ID updating the stock
   * @returns {object} Updated product
   */
  async updateProductStock(productId, quantity, userId) {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new ValidationError('Invalid product ID format');
    }

    if (typeof quantity !== 'number' || quantity < 0) {
      throw new ValidationError('Stock quantity must be a non-negative number');
    }

    const product = await Product.findOneAndUpdate(
      { _id: productId, deletedAt: { $exists: false } },
      { 
        stock: quantity,
        updatedBy: userId,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).populate([
      { path: 'brandId', select: 'name description' },
      { path: 'categories', select: 'name description' }
    ]);

    if (!product) {
      throw new NotFoundError('Product');
    }

    logger.info('Product stock updated', {
      productId,
      userId,
      newQuantity: quantity,
      productName: product.productName
    });

    // Convert to plain object and enrich attributes with names
    const productObj = product.toObject();
    return await this.enrichAttributesWithNames(productObj);
  }

  /**
   * Get featured products with filtering
   * @param {object} query - Query parameters
   * @returns {object} Featured products
   */
  async getFeaturedProducts(query = {}) {
    const {
      sort = 'featuredOrder',
      category,
      brand,
      priceMin,
      priceMax,
      search,
      featuredUntil
    } = query;

    // Build filter
    const filter = {
      isFeatured: true,
      status: 'active',
      isPublished: true
    };

    // Add featuredUntil filter if provided
    if (featuredUntil === 'true') {
      filter.$or = [
        { featuredUntil: { $exists: false } },
        { featuredUntil: null },
        { featuredUntil: { $gte: new Date() } }
      ];
    }

    // Add category filter
    if (category) {
      filter.categories = new mongoose.Types.ObjectId(category);
    }

    // Add brand filter
    if (brand) {
      filter.brandId = new mongoose.Types.ObjectId(brand);
    }

    // Add price range filter
    if (priceMin || priceMax) {
      filter.price = {};
      if (priceMin) filter.price.$gte = parseFloat(priceMin);
      if (priceMax) filter.price.$lte = parseFloat(priceMax);
    }

    // Add search filter
    if (search) {
      filter.$text = { $search: search };
    }

    // Build sort object
    const sortObj = {};
    if (sort === 'featuredOrder') {
      sortObj.featuredOrder = 1;
      sortObj.createdAt = -1;
    } else if (sort === 'price') {
      sortObj.price = 1;
    } else if (sort === 'createdAt') {
      sortObj.createdAt = -1;
    } else {
      sortObj[sort] = 1;
    }

    // Execute query
    const products = await Product.find(filter)
      .populate('categories', 'name description')
      .populate('brandId', 'name logo')
      .sort(sortObj)
      .lean();

    // Enrich attributes with names
    const enrichedProducts = await this.enrichAttributesWithNames(products);

    logger.info('Featured products retrieved', {
      count: enrichedProducts.length,
      filters: { category, brand, priceMin, priceMax, search }
    });

    return {
      products: enrichedProducts
    };
  }

  /**
   * Set product as featured
   * @param {string} productId - Product ID
   * @param {object} options - Featured options
   * @param {string} userId - User ID
   * @returns {object} Updated product
   */
  async setProductFeatured(productId, options = {}, userId) {
    const { order = 0, featuredUntil } = options;

    const updateData = {
      isFeatured: true,
      featuredOrder: order,
      updatedBy: userId
    };

    if (featuredUntil) {
      updateData.featuredUntil = new Date(featuredUntil);
    }

    const product = await Product.findByIdAndUpdate(
      productId,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'categories', select: 'name description' },
      { path: 'brandId', select: 'name logo' }
    ]);

    if (!product) {
      throw new NotFoundError('Product');
    }

    logger.info('Product set as featured', {
      productId,
      userId,
      order,
      featuredUntil,
      productName: product.productName
    });

    // Convert to plain object and enrich attributes with names
    const productObj = product.toObject();
    return await this.enrichAttributesWithNames(productObj);
  }

  /**
   * Remove product from featured
   * @param {string} productId - Product ID
   * @param {string} userId - User ID
   * @returns {object} Updated product
   */
  async unsetProductFeatured(productId, userId) {
    const product = await Product.findByIdAndUpdate(
      productId,
      {
        isFeatured: false,
        featuredOrder: 0,
        featuredUntil: null,
        updatedBy: userId
      },
      { new: true, runValidators: true }
    ).populate([
      { path: 'categories', select: 'name description' },
      { path: 'brandId', select: 'name logo' }
    ]);

    if (!product) {
      throw new NotFoundError('Product');
    }

    logger.info('Product removed from featured', {
      productId,
      userId,
      productName: product.productName
    });

    // Convert to plain object and enrich attributes with names
    const productObj = product.toObject();
    return await this.enrichAttributesWithNames(productObj);
  }

  /**
   * Update featured order
   * @param {string} productId - Product ID
   * @param {number} order - New order
   * @param {string} userId - User ID
   * @returns {object} Updated product
   */
  async updateFeaturedOrder(productId, order, userId) {
    const product = await Product.findByIdAndUpdate(
      productId,
      {
        featuredOrder: order,
        updatedBy: userId
      },
      { new: true, runValidators: true }
    ).populate([
      { path: 'categories', select: 'name description' },
      { path: 'brandId', select: 'name logo' }
    ]);

    if (!product) {
      throw new NotFoundError('Product');
    }

    logger.info('Featured order updated', {
      productId,
      userId,
      newOrder: order,
      productName: product.productName
    });

    // Convert to plain object and enrich attributes with names
    const productObj = product.toObject();
    return await this.enrichAttributesWithNames(productObj);
  }
}

module.exports = new ProductService();
