const express = require('express');
const router = express.Router();
const cityController = require('../controllers/cityController');
const { protect, adminOnly } = require('../middleware/auth');
const checkDBConnection = require('../middleware/dbConnection');

// Apply database connection check to all routes
router.use(checkDBConnection);

// Public routes
// GET all cities (Public - needed for address forms)
router.get('/', cityController.getCities);

// GET city by ID (Public - needed for address validation)
router.get('/:id', cityController.getCityById);

// Admin-only routes
// CREATE city (Admin only)
router.post('/', 
  protect, 
  adminOnly, 
  cityController.createCity
);

// UPDATE city (Admin only)
router.put('/:id', 
  protect, 
  adminOnly, 
  cityController.updateCity
);

// DELETE city (Admin only)
router.delete('/:id', 
  protect, 
  adminOnly, 
  cityController.deleteCity
);

module.exports = router;