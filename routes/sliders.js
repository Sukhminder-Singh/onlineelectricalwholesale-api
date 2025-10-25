const express = require('express');
const router = express.Router();
const sliderController = require('../controllers/sliderController');
const { protect, adminOnly } = require('../middleware/auth');
const checkDBConnection = require('../middleware/dbConnection');

// Apply database connection check to all routes
router.use(checkDBConnection);

// Public routes
// GET all sliders (Public - needed for homepage display)
router.get('/', sliderController.getSliders);

// GET a single slider by ID (Public - needed for slider display)
router.get('/:id', sliderController.getSlider);

// Admin-only routes
// CREATE a new slider (Admin only)
router.post('/', 
  protect, 
  adminOnly, 
  sliderController.createSlider
);

// UPDATE a slider (Admin only)
router.put('/:id', 
  protect, 
  adminOnly, 
  sliderController.updateSlider
);

// DELETE a slider (Admin only)
router.delete('/:id', 
  protect, 
  adminOnly, 
  sliderController.deleteSlider
);

module.exports = router;