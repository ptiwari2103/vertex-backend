const express = require('express');
const { VertexPin } = require('../models');
const pinController = require("../controllers/pinController");
const router = express.Router();

// Pin management routes
router.get('/allpins', pinController.getAllPins);
router.post('/create', pinController.createPins);
router.post('/bulk-assign', pinController.bulkAssignPins);
router.get('/assignedpins', pinController.getAssignedPins);

module.exports = router;
