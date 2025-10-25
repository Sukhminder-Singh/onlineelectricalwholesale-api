const express = require('express');
const router = express.Router();
const stateController = require('../controllers/stateController');
const { protect, adminOnly } = require('../middleware/auth');
const checkDBConnection = require('../middleware/dbConnection');

// Apply database connection check to all routes
router.use(checkDBConnection);

// Public routes
// GET all states (Public - needed for address forms)
router.get('/', stateController.getStates);

// GET state by ID (Public - needed for address validation)
router.get('/:id', stateController.getStateById);

// Admin-only routes
// CREATE state (Admin only)
router.post('/', 
  protect, 
  adminOnly, 
  stateController.createState
);

// UPDATE state (Admin only)
router.put('/:id', 
  protect, 
  adminOnly, 
  stateController.updateState
);

// DELETE state (Admin only)
router.delete('/:id', 
  protect, 
  adminOnly, 
  stateController.deleteState
);

module.exports = router;