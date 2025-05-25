const express = require('express');
const router = express.Router();
const recurringDepositController = require('../controllers/recurringDepositController');
const { verifyToken } = require('../controllers/userController');

// RD settings routes
router.get('/rd-settings', verifyToken, recurringDepositController.getRDSettings);
router.post('/rd-settings', verifyToken, recurringDepositController.addRDSetting);
router.put('/rd-settings/:id', verifyToken, recurringDepositController.updateRDSetting);

// RD deposits routes
router.get('/rd-deposits-by-setting', verifyToken, recurringDepositController.getRDDepositsBySetting);
router.post('/rd-deposit', verifyToken, recurringDepositController.addRecurringDeposit);
router.put('/rd-deposit/:deposit_id', verifyToken, recurringDepositController.updateRecurringDeposit);
router.post('/rd-calculate', verifyToken, recurringDepositController.calculateRecurringDeposits);

// RD transactions route
router.get('/rd-transactions', verifyToken, recurringDepositController.getRDTransactions);

// RD settlement route
router.post('/rd-settlement/:id', verifyToken, recurringDepositController.settleRecurringDeposit);

// RD page route (must be last to avoid conflicts with other routes)
router.get('/:id', verifyToken, recurringDepositController.getRecurringDeposit);

module.exports = router;
