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



// Recurring deposit routes
router.get('/recurring-deposit/:id',verifyToken, recurringDepositController.getRecurringDeposit);
router.post('/recurring-deposit/:id', verifyToken, recurringDepositController.addRecurringDeposit);
router.put('/recurring-deposit/:id', verifyToken, recurringDepositController.updateRecurringDeposit);
router.post('/calculate-recurring-deposits/:id', verifyToken, recurringDepositController.calculateRecurringDeposits); // :id is userId, setting_id is passed as query param
router.post('/rd-settlement/:id', verifyToken, recurringDepositController.settleRecurringDeposit); // Handle RD settlement


// RD transactions route
router.get('/rd-transactions', verifyToken, recurringDepositController.getRDTransactions);

// RD list route for frontend
//router.get('/rdlist', verifyToken, recurringDepositController.getRDList);


router.get('/user-setting-list', verifyToken, recurringDepositController.getUserSettingList);

// RD page route (must be last to avoid conflicts with other routes)
router.get('/:id', verifyToken, recurringDepositController.getRecurringDeposit);


module.exports = router;
