const express = require('express');
const { VertexPin } = require('../models');
const cardController = require("../controllers/cardController");
const router = express.Router();
const { verifyApiToken } = require('../middleware/auth');

// Card management routes
router.post('/request', verifyApiToken, cardController.addCard);
router.get('/details', cardController.getDetails);
router.get('/allcards', cardController.getAllCards); 
router.post('/update', cardController.updateCard); 
router.post('/update-card', cardController.updateCardDetails);
router.get('/requestcard', cardController.requestCard);
router.get('/transactions', cardController.getTransactions);
//router.get('/admin-details', cardController.getDetails);   
router.put('/:id/status', cardController.updateCardStatus);

// Card use and payable request routes
router.get('/use-request', cardController.getUseRequest);
router.get('/payable-request', cardController.getPayableRequest);
router.post('/create-use-request', cardController.createUseRequest);
router.post('/update-use-request', cardController.updateUseRequest);
router.post('/create-payable-request', cardController.createPayableRequest);
router.post('/update-payable-request', cardController.updatePayableRequest);
router.get('/calculate-payable-request', cardController.calculatePayableRequest);

module.exports = router;
