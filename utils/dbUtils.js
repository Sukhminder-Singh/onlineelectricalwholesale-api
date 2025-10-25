/**
 * Database utility functions
 */

const mongoose = require('mongoose');
const { logger } = require('../middleware/logger');

/**
 * Check if a value is a valid MongoDB ObjectId
 * @param {string} id - ID to validate
 * @returns {boolean} True if valid ObjectId
 */
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Convert string to ObjectId
 * @param {string} id - String ID to convert
 * @returns {ObjectId|null} ObjectId or null if invalid
 */
const toObjectId = (id) => {
  if (!isValidObjectId(id)) return null;
  return new mongoose.Types.ObjectId(id);
};

/**
 * Build aggregation pipeline for pagination
 * @param {object} match - Match stage conditions
 * @param {object} sort - Sort conditions
 * @param {number} skip - Number of documents to skip
 * @param {number} limit - Number of documents to limit
 * @param {array} populate - Fields to populate
 * @returns {array} Aggregation pipeline
 */
const buildPaginationPipeline = (match = {}, sort = { createdAt: -1 }, skip = 0, limit = 10, populate = []) => {
  const pipeline = [
    { $match: match },
    { $sort: sort },
    { $skip: skip },
    { $limit: limit }
  ];

  // Add population stages
  populate.forEach(pop => {
    if (typeof pop === 'string') {
      pipeline.push({
        $lookup: {
          from: `${pop}s`, // Assuming collection names are pluralized
          localField: pop,
          foreignField: '_id',
          as: pop
        }
      });
    } else if (typeof pop === 'object') {
      pipeline.push({
        $lookup: {
          from: pop.from,
          localField: pop.localField,
          foreignField: pop.foreignField,
          as: pop.as
        }
      });
    }
  });

  return pipeline;
};

/**
 * Execute paginated query with count
 * @param {Model} model - Mongoose model
 * @param {object} filter - Filter conditions
 * @param {object} options - Query options (sort, page, limit, populate)
 * @returns {Promise<object>} Results with pagination info
 */
const paginatedQuery = async (model, filter = {}, options = {}) => {
  const {
    sort = { createdAt: -1 },
    page = 1,
    limit = 10,
    populate = [],
    select = ''
  } = options;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  try {
    // Build query
    let query = model.find(filter);
    
    if (select) query = query.select(select);
    if (populate.length > 0) {
      populate.forEach(pop => {
        query = query.populate(pop);
      });
    }
    
    query = query.sort(sort).skip(skip).limit(parseInt(limit));

    // Execute query and count in parallel
    const [results, total] = await Promise.all([
      query.lean(),
      model.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    return {
      results,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    };
  } catch (error) {
    logger.error('Paginated query error', { error: error.message, filter, options });
    throw error;
  }
};

/**
 * Soft delete document by updating status
 * @param {Model} model - Mongoose model
 * @param {string} id - Document ID
 * @param {string} userId - User performing the deletion
 * @returns {Promise<object>} Updated document
 */
const softDelete = async (model, id, userId = null) => {
  const updateData = {
    status: 'deleted',
    deletedAt: new Date()
  };

  if (userId) {
    updateData.deletedBy = userId;
  }

  return await model.findByIdAndUpdate(id, updateData, { new: true });
};

/**
 * Restore soft deleted document
 * @param {Model} model - Mongoose model
 * @param {string} id - Document ID
 * @param {string} userId - User performing the restoration
 * @returns {Promise<object>} Updated document
 */
const restoreDeleted = async (model, id, userId = null) => {
  const updateData = {
    status: 'active',
    $unset: { deletedAt: 1, deletedBy: 1 }
  };

  if (userId) {
    updateData.updatedBy = userId;
    updateData.updatedAt = new Date();
  }

  return await model.findByIdAndUpdate(id, updateData, { new: true });
};

/**
 * Check if document exists
 * @param {Model} model - Mongoose model
 * @param {object} filter - Filter conditions
 * @returns {Promise<boolean>} True if document exists
 */
const documentExists = async (model, filter) => {
  try {
    const count = await model.countDocuments(filter);
    return count > 0;
  } catch (error) {
    logger.error('Document exists check error', { error: error.message, filter });
    return false;
  }
};

/**
 * Find document by ID with error handling
 * @param {Model} model - Mongoose model
 * @param {string} id - Document ID
 * @param {object} options - Query options (populate, select)
 * @returns {Promise<object|null>} Document or null
 */
const findById = async (model, id, options = {}) => {
  if (!isValidObjectId(id)) {
    return null;
  }

  try {
    let query = model.findById(id);
    
    if (options.populate) {
      if (Array.isArray(options.populate)) {
        options.populate.forEach(pop => {
          query = query.populate(pop);
        });
      } else {
        query = query.populate(options.populate);
      }
    }
    
    if (options.select) {
      query = query.select(options.select);
    }

    return await query.lean();
  } catch (error) {
    logger.error('Find by ID error', { error: error.message, id, options });
    return null;
  }
};

/**
 * Update document with audit trail
 * @param {Model} model - Mongoose model
 * @param {string} id - Document ID
 * @param {object} updateData - Data to update
 * @param {string} userId - User performing the update
 * @returns {Promise<object>} Updated document
 */
const updateWithAudit = async (model, id, updateData, userId = null) => {
  const auditData = {
    ...updateData,
    updatedAt: new Date()
  };

  if (userId) {
    auditData.updatedBy = userId;
  }

  return await model.findByIdAndUpdate(id, auditData, { 
    new: true, 
    runValidators: true 
  });
};

/**
 * Create document with audit trail
 * @param {Model} model - Mongoose model
 * @param {object} data - Document data
 * @param {string} userId - User creating the document
 * @returns {Promise<object>} Created document
 */
const createWithAudit = async (model, data, userId = null) => {
  const auditData = {
    ...data,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  if (userId) {
    auditData.createdBy = userId;
    auditData.updatedBy = userId;
  }

  const document = new model(auditData);
  return await document.save();
};

/**
 * Bulk update documents
 * @param {Model} model - Mongoose model
 * @param {object} filter - Filter conditions
 * @param {object} updateData - Data to update
 * @param {string} userId - User performing the update
 * @returns {Promise<object>} Update result
 */
const bulkUpdate = async (model, filter, updateData, userId = null) => {
  const auditData = {
    ...updateData,
    updatedAt: new Date()
  };

  if (userId) {
    auditData.updatedBy = userId;
  }

  return await model.updateMany(filter, auditData);
};

/**
 * Get database statistics
 * @returns {Promise<object>} Database statistics
 */
const getDatabaseStats = async () => {
  try {
    const db = mongoose.connection.db;
    const stats = await db.stats();
    
    return {
      collections: stats.collections,
      dataSize: stats.dataSize,
      storageSize: stats.storageSize,
      indexes: stats.indexes,
      indexSize: stats.indexSize,
      objects: stats.objects
    };
  } catch (error) {
    logger.error('Database stats error', { error: error.message });
    return null;
  }
};

/**
 * Check database connection health
 * @returns {Promise<object>} Connection health status
 */
const checkConnectionHealth = async () => {
  try {
    const state = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    const ping = await mongoose.connection.db.admin().ping();
    
    return {
      status: states[state] || 'unknown',
      readyState: state,
      ping: ping.ok === 1,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    };
  } catch (error) {
    logger.error('Connection health check error', { error: error.message });
    return {
      status: 'error',
      error: error.message
    };
  }
};

/**
 * Create text index for search functionality
 * @param {Model} model - Mongoose model
 * @param {array} fields - Fields to index
 * @returns {Promise<void>}
 */
const createTextIndex = async (model, fields) => {
  try {
    const indexSpec = {};
    fields.forEach(field => {
      indexSpec[field] = 'text';
    });
    
    await model.collection.createIndex(indexSpec);
    logger.info(`Text index created for ${model.modelName}`, { fields });
  } catch (error) {
    logger.error('Text index creation error', { 
      error: error.message, 
      model: model.modelName, 
      fields 
    });
  }
};

/**
 * Perform text search
 * @param {Model} model - Mongoose model
 * @param {string} searchTerm - Search term
 * @param {object} filter - Additional filter conditions
 * @param {object} options - Query options
 * @returns {Promise<array>} Search results
 */
const textSearch = async (model, searchTerm, filter = {}, options = {}) => {
  try {
    const searchFilter = {
      ...filter,
      $text: { $search: searchTerm }
    };

    let query = model.find(searchFilter, { score: { $meta: 'textScore' } });
    
    if (options.populate) {
      query = query.populate(options.populate);
    }
    
    if (options.limit) {
      query = query.limit(options.limit);
    }

    return await query.sort({ score: { $meta: 'textScore' } }).lean();
  } catch (error) {
    logger.error('Text search error', { 
      error: error.message, 
      searchTerm, 
      filter, 
      options 
    });
    return [];
  }
};

module.exports = {
  isValidObjectId,
  toObjectId,
  buildPaginationPipeline,
  paginatedQuery,
  softDelete,
  restoreDeleted,
  documentExists,
  findById,
  updateWithAudit,
  createWithAudit,
  bulkUpdate,
  getDatabaseStats,
  checkConnectionHealth,
  createTextIndex,
  textSearch
};