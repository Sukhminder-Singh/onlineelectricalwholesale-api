const Brand = require('../models/Brand');
const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const s3Config = require('../config/s3Config');

exports.createBrand = async (req, res) => {
  try {
    const data = req.body;
    const logo = req.file ? req.file.location : ''; // S3 returns the file URL in location
    
    // Check if brand with same name already exists
    const existingBrand = await Brand.findOne({ name: { $regex: new RegExp(`^${data.name}$`, 'i') } });
    if (existingBrand) {
      // Delete uploaded file from S3 if brand creation fails
      if (req.file && s3Config.hasS3Config) {
        try {
          await s3Config.s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: req.file.key
          }));
        } catch (error) {
          console.error('Error deleting file from S3:', error);
        }
      }
      return res.status(400).json({
        success: false,
        message: 'Brand with this name already exists' 
      });
    }

    const brand = new Brand({ ...data, logo });
    await brand.save();
    
    res.status(201).json({
      success: true,
      message: 'Brand created successfully',
      data: brand
    });
  } catch (err) {
    // Delete uploaded file from S3 if brand creation fails
    if (req.file && s3Config.hasS3Config) {
      try {
        await s3Config.s3Client.send(new DeleteObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: req.file.key
        }));
      } catch (error) {
        console.error('Error deleting file from S3:', error);
      }
    }
    
    console.error('Create brand error:', err);
    res.status(400).json({ 
      success: false,
      message: 'Failed to create brand',
      error: err.message 
    });
  }
};

exports.getBrands = async (req, res) => {
  try {
    const { search, isActive } = req.query;
    
    // Build filter
    const filter = {};
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    
    // Get all brands without pagination
    const brands = await Brand.find(filter)
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: brands
    });
  } catch (err) {
    console.error('Get brands error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch brands',
      error: err.message 
    });
  }
};

exports.getBrandById = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) {
      return res.status(404).json({ 
        success: false,
        message: 'Brand not found' 
      });
    }
    
    res.json({
      success: true,
      data: brand
    });
  } catch (err) {
    console.error('Get brand by ID error:', err);
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid brand ID format' 
      });
    }
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch brand',
      error: err.message 
    });
  }
};

exports.updateBrand = async (req, res) => {
  try {
    const data = req.body;
    const newLogo = req.file ? req.file.location : undefined; // S3 returns the file URL in location
    
    // Check if brand exists
    const existingBrand = await Brand.findById(req.params.id);
    if (!existingBrand) {
      // Delete uploaded file from S3 if brand doesn't exist
      if (req.file && s3Config.hasS3Config) {
        try {
          await s3Config.s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: req.file.key
          }));
        } catch (error) {
          console.error('Error deleting file from S3:', error);
        }
      }
      return res.status(404).json({ 
        success: false,
        message: 'Brand not found' 
      });
    }
    
    // Check for name conflicts
    if (data.name && data.name !== existingBrand.name) {
      const nameConflict = await Brand.findOne({ 
        name: { $regex: new RegExp(`^${data.name}$`, 'i') },
        _id: { $ne: req.params.id }
      });
      if (nameConflict) {
        // Delete uploaded file from S3 if name conflicts
        if (req.file && s3Config.hasS3Config) {
          try {
            await s3Config.s3Client.send(new DeleteObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Key: req.file.key
            }));
          } catch (error) {
            console.error('Error deleting file from S3:', error);
          }
        }
        return res.status(400).json({ 
          success: false,
          message: 'Brand with this name already exists' 
        });
      }
    }
    
    const updateData = { ...data };
    if (newLogo) {
      updateData.logo = newLogo;
      // Delete old logo file from S3
      if (existingBrand.logo && s3Config.hasS3Config) {
        try {
          // Extract the key from the S3 URL
          const key = existingBrand.logo.split('/').slice(3).join('/');
          
          await s3Config.s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key
          }));
        } catch (error) {
          console.error('Error deleting old logo from S3:', error);
        }
      }
    }
    
    const brand = await Brand.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      message: 'Brand updated successfully',
      data: brand
    });
  } catch (err) {
    // Delete uploaded file from S3 if update fails
    if (req.file && s3Config.hasS3Config) {
      try {
        await s3Config.s3Client.send(new DeleteObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: req.file.key
        }));
      } catch (error) {
        console.error('Error deleting file from S3:', error);
      }
    }
    
    console.error('Update brand error:', err);
    res.status(400).json({ 
      success: false,
      message: 'Failed to update brand',
      error: err.message 
    });
  }
};

exports.updateBrandStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    
    const brand = await Brand.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true, runValidators: true }
    );
    
    if (!brand) {
      return res.status(404).json({ 
        success: false,
        message: 'Brand not found' 
      });
    }
    
    res.json({
      success: true,
      message: `Brand ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: brand
    });
  } catch (err) {
    console.error('Update brand status error:', err);
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid brand ID format' 
      });
    }
    res.status(400).json({ 
      success: false,
      message: 'Failed to update brand status',
      error: err.message 
    });
  }
};

exports.deleteBrand = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) {
      return res.status(404).json({ 
        success: false,
        message: 'Brand not found' 
      });
    }
    
    // Delete logo file from S3 if it exists
    if (brand.logo && s3Config.hasS3Config) {
      try {
        // Extract the key from the S3 URL
        const key = brand.logo.split('/').slice(3).join('/'); // This gets the path after the bucket name
        
        await s3Config.s3Client.send(new DeleteObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: key
        }));
        console.log('Successfully deleted file from S3');
      } catch (error) {
        console.error('Error deleting file from S3:', error);
        // Continue with brand deletion even if S3 deletion fails
      }
    }
    
    await Brand.findByIdAndDelete(req.params.id);
    
    res.json({ 
      success: true,
      message: 'Brand deleted successfully' 
    });
  } catch (err) {
    console.error('Delete brand error:', err);
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid brand ID format' 
      });
    }
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete brand',
      error: err.message 
    });
  }
};