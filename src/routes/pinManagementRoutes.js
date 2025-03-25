const express = require('express');
const router = express.Router();
const pinManagementController = require('../controllers/pinManagementController');
const { isAdmin } = require('../middleware/auth');

// Apply admin middleware to all routes
router.use(isAdmin);

// List pins
router.get('/', pinManagementController.listPins);

// Create new pins
router.post('/create', pinManagementController.createPins);

// Bulk assign pins
router.post('/assign', pinManagementController.assignPins);

module.exports = router;