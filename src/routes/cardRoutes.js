const express = require('express');
const { VertexPin } = require('../models');
const cardController = require("../controllers/cardController");
const router = express.Router();
const { verifyApiToken } = require('../middleware/auth');

// Card management routes
router.post('/request', verifyApiToken, cardController.addCard);
router.get('/details', verifyApiToken, cardController.getDetails);
router.get('/allcards', cardController.getAllCards); 
router.post('/update', cardController.updateCard); 
router.post('/update-card', cardController.updateCardDetails);
router.get('/requestcard', cardController.requestCard);
router.get('/transactions', cardController.getTransactions);
router.get('/admin-details', cardController.getDetails);   
router.put('/:id/status', cardController.updateCardStatus);

module.exports = router;
