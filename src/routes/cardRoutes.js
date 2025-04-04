const express = require('express');
const { VertexPin } = require('../models');
const cardController = require("../controllers/cardController");
const router = express.Router();
const { verifyApiToken } = require('../middleware/auth');

// Card management routes
router.post('/request', verifyApiToken, cardController.addCard);
router.get('/details', verifyApiToken, cardController.getDetails);
router.get('/allcards', cardController.getAllCards);    

module.exports = router;
