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



// KYC form submission route
router.post('/kyc', upload, userController.kycform);
router.post('/profile', upload, userController.profileform);
router.post('/addupdateaddress', userController.addUpdateAddress);
router.post('/addupdatebank', userController.addUpdateBank);

// Define routes
router.get('/allmembers', userController.getAllMembers);
router.post("/register", userController.registerUser);
router.post('/login', userController.login);
router.post('/prelogin', userController.prelogin);
router.put('/:id/status', userController.updateMemberStatus);
router.put('/:id/kycstatus', userController.updatekycStatus);
router.get('/:id', userController.viewMember);
router.delete('/:id', userController.deleteMember);

module.exports = router;
