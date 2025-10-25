const express = require('express');
const router = express.Router();
const countryController = require('../controllers/countryController');
const { protect, adminOnly } = require('../middleware/auth');
const checkDBConnection = require('../middleware/dbConnection');

// Apply database connection check to all routes
router.use(checkDBConnection);

// Public routes
// GET all countries (Public - needed for address forms)
router.get('/', countryController.getCountries);

// GET country by ID (Public - needed for address validation)
router.get('/:id', countryController.getCountryById);

// Admin-only routes
// CREATE country (Admin only)
router.post('/', 
  protect, 
  adminOnly, 
  countryController.createCountry
);

// UPDATE country (Admin only)
router.put('/:id', 
  protect, 
  adminOnly, 
  countryController.updateCountry
);

// DELETE country (Admin only)
router.delete('/:id', 
  protect, 
  adminOnly, 
  countryController.deleteCountry
);

module.exports = router;