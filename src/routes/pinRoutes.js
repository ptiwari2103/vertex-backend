const express = require('express');
const { VertexPin } = require('../models');
const pinController = require("../controllers/pinController");
const router = express.Router();

// Get all pins
router.get('/allpins', pinController.getAllPins);

// Add new pin
// router.post('/addpin', pinController.addPin);

// // Update pin
// router.put('/updatepin', pinController.updatePin);

// // Delete pin
// router.delete('/deletepin', pinController.deletePin);

module.exports = router;
