const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const fixedDepositController = require("../controllers/fixedDepositController");
const { body, validationResult } = require('express-validator');
const { User, State, District } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyApiToken } = require('../middleware/auth');

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Save files in 'uploads/' directory
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
    }
});

// File Filter for Validation (Optional)
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

// Multer Upload Middleware
const upload = multer({
    storage: storage,
    fileFilter: fileFilter
}).fields([
    { name: 'pan_number_image', maxCount: 1 },
    { name: 'aadhar_number_image_front', maxCount: 1 },
    { name: 'aadhar_number_image_back', maxCount: 1 },
    { name: 'profile_image', maxCount: 1 },
    { name: 'divyang_certificate', maxCount: 1 }
]);

router.get('/add/:id', userController.addMember);

// Protected routes - require API authentication
router.post('/kyc', verifyApiToken, upload, userController.kycform);
router.post('/profile', verifyApiToken, upload, userController.profileform);
router.post('/addupdateaddress', verifyApiToken, userController.addUpdateAddress);
router.post('/addupdatebank', verifyApiToken, userController.addUpdateBank);


router.post('/adminkyc',  upload, userController.kycform);
router.post('/adminprofile', upload, userController.profileform);
router.post('/adminaddupdateaddress',  userController.addUpdateAddress);
router.post('/adminaddupdatebank',  userController.addUpdateBank);


// Member management routes
router.get('/allmembers', userController.getAllMembers);
router.get('/edit/:id', userController.editMember); 
router.get('/view/:id', userController.viewMemberDetails); 
router.put('/:id/status', userController.updateMemberStatus);
router.put('/:id/kycstatus', userController.updatekycStatus);
router.put('/:id/isagent', userController.updateIsAgent);
router.put('/:id/isfranchise', userController.updateIsFranchise);
router.put('/:id/isedit', userController.updateIsEdit);
router.put('/:id/pinpasswordstatus', userController.updatePinPasswordStatus);

// Compulsory deposit routes
router.get('/compulsory-deposit/:id', userController.getCompulsoryDeposit);
router.post('/compulsory-deposit/:id', userController.addCompulsoryDeposit);
router.put('/compulsory-deposit/:id', userController.updateCompulsoryDeposit);
router.post('/calculate-deposits/:id', userController.calculateDeposits);

// Recurring deposit routes - moved to recurringDepositRoutes.js

// Fixed deposit routes
router.get('/fixed-deposit/:id', fixedDepositController.getFixedDeposit);
router.post('/fixed-deposit/:id', fixedDepositController.addFixedDeposit);
router.put('/fixed-deposit/:id', fixedDepositController.updateFixedDeposit);
router.post('/calculate-fixed-deposits/:id', fixedDepositController.calculateFixedDeposits);

// CD Transactions route
router.get('/cd-transactions', userController.getCDTransactions);

// RD Transactions route - moved to recurringDepositRoutes.js

// FD Transactions route
router.get('/fd-transactions', fixedDepositController.getFDTransactions);

// RD Settings routes - moved to recurringDepositRoutes.js

// RD Deposits by Setting route - moved to recurringDepositRoutes.js

// Redirect for backward compatibility with RD routes
router.get('/recurring-deposit/:id', (req, res) => {
    res.redirect(`/recurring-deposits/${req.params.id}`);
});

// Overdraft Deposits route
router.get('/overdraft-deposits', userController.getOverdraftDeposits);

// CD Settings routes
router.get('/cd-settings', userController.getCDSettings);
router.post('/cd-settings', userController.addCDSetting);
router.put('/cd-settings/:id', userController.updateCDSetting);

// Member address management
router.put('/address/:id/status', userController.updateAddressStatus);
router.delete('/address/:id', userController.deleteAddress);

// Member bank management
router.put('/bank/:id/status', userController.updateBankStatus);
router.delete('/bank/:id', userController.deleteBank);

// Define routes
router.post("/register", userController.registerUser);
router.post('/login', userController.login);
router.post('/prelogin', userController.prelogin);
router.get('/:id', userController.viewMember);
router.delete('/:id', userController.deleteMember);

// Pin Password
router.post('/create-pin-password', verifyApiToken, userController.createPinPassword);
router.post('/verify-pin-password', verifyApiToken, userController.verifyPinPassword);

// Member data
router.post('/getmemberdata', verifyApiToken, userController.getMemberData);

// Agent routes
router.post('/request-agent', verifyApiToken, userController.requestAgent);

// Agent status
router.get('/:id/agent-status', verifyApiToken, userController.updateAgentStatus);

router.get('/:id/agent-members', verifyApiToken, userController.getAgentmembers);

// FD Settings routes
router.get('/fd-settings', fixedDepositController.getFDSettings);
router.post('/fd-settings', fixedDepositController.addFDSetting);
router.put('/fd-settings/:id', fixedDepositController.updateFDSetting);

module.exports = router;