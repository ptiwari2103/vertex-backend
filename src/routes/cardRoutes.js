const express = require('express');
const { VertexPin } = require('../models');
const cardController = require("../controllers/cardController");
const router = express.Router();
const { verifyApiToken } = require('../middleware/auth');

// Card management routes
router.post('/request', verifyApiToken, cardController.addCard);
router.post('/payment-request', verifyApiToken, cardController.addPaymentRequest);
// router.get('/use-payment-request', cardController.addUsePaymentRequest);
// router.put('/:id/use-payment-request-update', cardController.updateUsePaymentRequest);

router.get('/use-request', cardController.addUseRequest);
router.put('/:id/use-request-update', cardController.updateUseRequest);

router.get('/payable-request', cardController.addPayableRequest);
router.put('/:id/payable-request-update', cardController.updatePayableRequest);

router.get('/getpayable', cardController.getPayable);
router.post('/pay-payable', verifyApiToken, cardController.payPayable);

router.get('/details', verifyApiToken, cardController.getDetails);
router.get('/allcards', cardController.getAllCards); 
router.post('/update', cardController.updateCard); 
router.post('/update-card', cardController.updateCardDetails);
router.get('/requestcard', cardController.requestCard);
router.get('/transactions', cardController.getTransactions);
router.get('/admin-details', cardController.getDetails);   
router.put('/:id/status', cardController.updateCardStatus);

module.exports = router;
