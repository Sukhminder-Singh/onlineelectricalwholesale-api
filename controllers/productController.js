const ProductService = require('../services/ProductService');
const ResponseService = require('../services/ResponseService');
const { asyncHandler } = require('../middleware/errorHandler');
const { logger } = require('../middleware/logger');


/**
 * Create a new product
 * @route POST /api/products
 * @access Private (Admin)
 */
exports.createProduct = asyncHandler(async (req, res) => {
  const product = await ProductService.createProduct(req.body, req.files, req.user?.id);
  return ResponseService.created(res, product, 'Product created successfully');
});

/**
 * Get all products with filtering, sorting, and pagination
 * @route GET /api/products
 * @access Public
 */
exports.getProducts = asyncHandler(async (req, res) => {
  const result = await ProductService.getProducts(req.query);
  return ResponseService.paginated(res, result.products, result.pagination, 'Products retrieved successfully');
});

/**
 * Get all products for admin with full visibility and management filters
 * @route GET /api/products/admin
 * @access Private (Admin)
 */
exports.getAdminProducts = asyncHandler(async (req, res) => {
  const options = {
    ...req.query,
    // Admin default: show everything unless specified
    status: req.query.status || 'all',
    includeDeleted: req.query.includeDeleted ?? true
  };
  const result = await ProductService.getProducts(options);
  return ResponseService.paginated(res, result.products, result.pagination, 'Admin products retrieved successfully');
});

/**
 * Get product by ID
 * @route GET /api/products/:id
 * @access Public
 */
exports.getProductById = asyncHandler(async (req, res) => {
  const product = await ProductService.getProductById(req.params.id);
  return ResponseService.success(res, 200, 'Product retrieved successfully', product);
});

/**
 * Update product by ID
 * @route PUT /api/products/:id
 * @access Private (Admin)
 */
exports.updateProduct = asyncHandler(async (req, res) => {
  const product = await ProductService.updateProduct(req.params.id, req.body, req.files, req.user?.id);
  return ResponseService.updated(res, product, 'Product updated successfully');
});

/**
 * Delete product by ID
 * @route DELETE /api/products/:id
 * @access Private (Admin)
 */
exports.deleteProduct = asyncHandler(async (req, res) => {
  await ProductService.deleteProduct(req.params.id, req.user?.id);
  return ResponseService.deleted(res, 'Product deleted successfully');
});

/**
 * Get products by category
 * @route GET /api/products/category/:categoryId
 * @access Public
 */
exports.getProductsByCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const result = await ProductService.getProductsByCategory(categoryId, req.query);
  return ResponseService.paginated(res, result.products, result.pagination, 'Products retrieved successfully');
});

/**
 * Get products by brand
 * @route GET /api/products/brand/:brandId
 * @access Public
 */
exports.getProductsByBrand = asyncHandler(async (req, res) => {
  const { brandId } = req.params;
  const result = await ProductService.getProductsByBrand(brandId, req.query);
  return ResponseService.success(res, 200, 'Products retrieved successfully', result.products);
});

/**
 * Get products by category slug
 * @route GET /api/category/:slug
 * @access Public
 */
exports.getProductsByCategorySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const { fields } = req.query;
  
  // Parse fields parameter if provided
  const options = { ...req.query };
  if (fields) {
    options.fields = fields;
  }
  
  const result = await ProductService.getProductsByCategorySlug(slug, options);
  return ResponseService.success(res, 200, 'Products retrieved successfully', {
    products: result.products,
    category: result.category,
    categoryIds: result.categoryIds,
    pagination: result.pagination
  });
});

/**
 * Bulk update products
 * @route PUT /api/products/bulk
 * @access Private (Admin)
 */
exports.bulkUpdateProducts = asyncHandler(async (req, res) => {
  const { updates } = req.body;
  
  if (!Array.isArray(updates) || updates.length === 0) {
    return ResponseService.badRequest(res, 'Updates array is required and cannot be empty');
  }
  
  const result = await ProductService.bulkUpdateProducts(updates, req.user?.id);
  return ResponseService.success(res, 200, 'Bulk update completed', result);
});

/**
 * Get product statistics
 * @route GET /api/products/statistics
 * @access Private (Admin)
 */
exports.getProductStatistics = asyncHandler(async (req, res) => {
  const statistics = await ProductService.getProductStatistics();
  return ResponseService.success(res, 200, 'Product statistics retrieved successfully', statistics);
});

/**
 * Duplicate a product
 * @route POST /api/products/:id/duplicate
 * @access Private (Admin)
 */
exports.duplicateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const overrides = req.body;
  
  const duplicatedProduct = await ProductService.duplicateProduct(id, overrides, req.user?.id);
  return ResponseService.created(res, duplicatedProduct, 'Product duplicated successfully');
});

/**
 * Update product stock
 * @route PATCH /api/products/:id/stock
 * @access Private (Admin)
 */
exports.updateProductStock = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;
  
  if (typeof quantity !== 'number') {
    return ResponseService.badRequest(res, 'Quantity must be a number');
  }
  
  const product = await ProductService.updateProductStock(id, quantity, req.user?.id);
  return ResponseService.updated(res, product, 'Product stock updated successfully');
});

/**
 * Get low stock products
 * @route GET /api/products/low-stock
 * @access Private (Admin)
 */
exports.getLowStockProducts = asyncHandler(async (req, res) => {
  const options = { ...req.query, isLowStock: true };
  const result = await ProductService.getProducts(options);
  return ResponseService.paginated(res, result.products, result.pagination, 'Low stock products retrieved successfully');
});

/**
 * Get out of stock products
 * @route GET /api/products/out-of-stock
 * @access Private (Admin)
 */
exports.getOutOfStockProducts = asyncHandler(async (req, res) => {
  const options = { ...req.query, stockStatus: 'out_of_stock' };
  const result = await ProductService.getProducts(options);
  return ResponseService.paginated(res, result.products, result.pagination, 'Out of stock products retrieved successfully');
});

/**
 * Get featured products
 * @route GET /api/products/featured
 * @access Public
 */
exports.getFeaturedProducts = asyncHandler(async (req, res) => {
  const result = await ProductService.getFeaturedProducts(req.query);
  return ResponseService.paginated(res, result.products, result.pagination, 'Featured products retrieved successfully');
});

/**
 * Get admin featured products for management
 * @route GET /api/products/admin/featured
 * @access Private (Admin)
 */
exports.getAdminFeaturedProducts = asyncHandler(async (req, res) => {
  const options = {
    ...req.query,
    isFeatured: true,
    includeDeleted: req.query.includeDeleted ?? true
  };
  const result = await ProductService.getProducts(options);
  return ResponseService.paginated(res, result.products, result.pagination, 'Admin featured products retrieved successfully');
});

/**
 * Set product as featured
 * @route PATCH /api/products/:id/feature
 * @access Private (Admin)
 */
exports.setProductFeatured = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { order, featuredUntil } = req.body;
  
  if (order !== undefined && (typeof order !== 'number' || order < 0)) {
    return ResponseService.badRequest(res, 'Featured order must be a non-negative number');
  }
  
  if (featuredUntil && isNaN(Date.parse(featuredUntil))) {
    return ResponseService.badRequest(res, 'Invalid featuredUntil date format');
  }
  
  const product = await ProductService.setProductFeatured(id, { order, featuredUntil }, req.user?.id);
  return ResponseService.updated(res, product, 'Product set as featured successfully');
});

/**
 * Remove product from featured
 * @route PATCH /api/products/:id/unfeature
 * @access Private (Admin)
 */
exports.unsetProductFeatured = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await ProductService.unsetProductFeatured(id, req.user?.id);
  return ResponseService.updated(res, product, 'Product removed from featured successfully');
});

/**
 * Update featured order
 * @route PATCH /api/products/:id/feature-order
 * @access Private (Admin)
 */
exports.updateFeaturedOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { order } = req.body;
  
  if (typeof order !== 'number' || order < 0) {
    return ResponseService.badRequest(res, 'Featured order must be a non-negative number');
  }
  
  const product = await ProductService.updateFeaturedOrder(id, order, req.user?.id);
  return ResponseService.updated(res, product, 'Featured order updated successfully');
}); 