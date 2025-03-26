const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { body, validationResult } = require('express-validator');
const { User, State, District } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = 'uploads/kyc';
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File Filter for Validation
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Only .jpeg, .jpg and .png files are allowed!'), false);
    }
};

// Multer Upload Middleware
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: fileFilter
}).fields([
    { name: 'pan_number_image', maxCount: 1 },
    { name: 'aadhar_number_image_front', maxCount: 1 },
    { name: 'aadhar_number_image_back', maxCount: 1 },
    { name: 'profile_image', maxCount: 1 },
    { name: 'divyang_certificate', maxCount: 1 }
]);

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading.
        return res.status(400).json({
            success: false,
            message: err.message || 'File upload error'
        });
    } else if (err) {
        // An unknown error occurred when uploading.
        return res.status(500).json({
            success: false,
            message: 'Internal server error during file upload'
        });
    }
    next();
};

// KYC form submission route
router.post('/kyc', upload, handleMulterError, userController.kycform);
router.post('/profile', upload, handleMulterError, userController.profileform);
router.post('/addupdateaddress', userController.addUpdateAddress);
router.post('/addupdatebank', userController.addUpdateBank);

// Member management routes
router.get('/allmembers', userController.getAllMembers);
router.get('/edit/:id', userController.editMember); 
router.get('/view/:id', userController.viewMemberDetails); 
router.put('/:id/status', userController.updateMemberStatus);
router.put('/:id/kyc-status', userController.updatekycStatus);

// Member address management
router.post('/members/addupdateaddress', userController.addUpdateAddress);
router.put('/members/address/:id/status', userController.updateAddressStatus);
router.delete('/members/address/:id', userController.deleteAddress);

// Member bank management
router.post('/members/addupdatebank', userController.addUpdateBank);
router.put('/members/bank/:id/status', userController.updateBankStatus);
router.delete('/members/bank/:id', userController.deleteBank);

// Define routes
router.post("/register", userController.registerUser);
router.post('/login', userController.login);
router.post('/prelogin', userController.prelogin);
router.get('/:id', userController.viewMember);
router.delete('/:id', userController.deleteMember);

module.exports = router;