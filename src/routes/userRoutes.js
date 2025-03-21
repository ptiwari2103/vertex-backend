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
    { name: 'aadhar_number_image_back', maxCount: 1 }
]);


// Calculate age from date
const calculateAge = (birthDate) => {
    const [day, month, year] = birthDate.split('-');
    const today = new Date();
    const birth = new Date(year, month - 1, day);
    
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }    
    return age;
};



// KYC form submission route
router.post('/kyc', upload, userController.kycform);
// Define routes
router.get('/allmembers', userController.getAllMembers);
router.post("/register", userController.registerUser);
router.post('/login', userController.login);
router.post('/prelogin', userController.prelogin);
router.put('/:id/status', userController.updateMemberStatus);
router.get('/:id', userController.viewMember);
router.delete('/:id', userController.deleteMember);

module.exports = router;
