const express = require('express');
const router = express.Router();
const fixedDepositController = require('../controllers/fixedDepositController');
const { verifyToken } = require('../controllers/userController');

// FD settings routes
router.get('/fd-settings', verifyToken, fixedDepositController.getFDSettings);
router.post('/fd-settings', verifyToken, fixedDepositController.addFDSetting);
router.put('/fd-settings/:id', verifyToken, fixedDepositController.updateFDSetting);

// FD deposits routes
router.get('/fd-deposits-by-setting', verifyToken, fixedDepositController.getFDBySetting);
router.post('/fd-deposit', verifyToken, fixedDepositController.addFixedDeposit);
router.put('/fd-deposit/:deposit_id', verifyToken, fixedDepositController.updateFixedDeposit);
router.post('/fd-calculate', verifyToken, fixedDepositController.calculateFixedDeposits);


// Fixed deposit routes
router.get('/fixed-deposit/:id',verifyToken, fixedDepositController.getFixedDeposit);
router.post('/fixed-deposit/:id', verifyToken, fixedDepositController.addFixedDeposit);
router.put('/fixed-deposit/:id', verifyToken, fixedDepositController.updateFixedDeposit);
router.post('/calculate-fixed-deposits/:id', verifyToken, fixedDepositController.calculateFixedDeposits); // :id is userId, setting_id is passed as query param
router.post('/fixed-deposit-settlement/:id', verifyToken, fixedDepositController.settleFixedDeposit); // Handle FD settlement


// FD transactions route
router.get('/fd-transactions', verifyToken, fixedDepositController.getFDTransactions);


router.get('/user-setting-list', verifyToken, fixedDepositController.getUserSettingList);

// FD page route (must be last to avoid conflicts with other routes)
router.get('/:id', verifyToken, fixedDepositController.getFixedDeposit);


module.exports = router;
