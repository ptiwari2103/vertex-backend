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


// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/kyc';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG and JPG are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access denied. No token provided.'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Invalid token.'
        });
    }
};

// Validation for KYC submission
const kycValidation = [
    body('aadhar_number')
        .notEmpty().withMessage('Aadhar number is required')
        .matches(/^\d{12}$/).withMessage('Invalid Aadhar number format'),
    
    body('pan_number')
        .notEmpty().withMessage('PAN number is required')
        .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).withMessage('Invalid PAN number format'),
    
    body('user_id')
        .notEmpty().withMessage('User ID is required')
        .matches(/^\d{6}$/).withMessage('Invalid User ID format')
];


// KYC form submission route
router.post('/kyc',
    verifyToken,
    (req, res, next) => {
        console.log('Token verification passed');
        console.log('Token payload:', req.user);
        next();
    },
    upload.fields([
        { name: 'aadhar_front', maxCount: 1 },
        { name: 'aadhar_back', maxCount: 1 },
        { name: 'pan_front', maxCount: 1 }
    ]),
    (req, res, next) => {
        console.log('File upload middleware passed');
        console.log('Received files:', req.files ? Object.keys(req.files) : 'No files');
        if (req.files) {
            Object.entries(req.files).forEach(([key, files]) => {
                console.log(`${key}:`, files.map(f => ({
                    filename: f.filename,
                    size: f.size,
                    mimetype: f.mimetype
                })));
            });
        }
        next();
    },
    kycValidation,
    async (req, res) => {
        try {
            console.log('Starting KYC submission process');
            console.log('Request body:', {
                user_id: req.body.user_id,
                aadhar_number: req.body.aadhar_number,
                pan_number: req.body.pan_number
            });

            // Validate request body
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                console.log('Validation errors:', errors.array());
                // Delete uploaded files if validation fails
                if (req.files) {
                    Object.values(req.files).forEach(fileArray => {
                        fileArray.forEach(file => {
                            if (fs.existsSync(file.path)) {
                                fs.unlinkSync(file.path);
                                console.log('Deleted file:', file.path);
                            }
                        });
                    });
                }
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            // Create uploads directory if it doesn't exist
            const uploadDir = 'uploads/kyc';
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
                console.log('Created upload directory:', uploadDir);
            }

            // Check if user exists and matches the token
            console.log('Finding user with ID:', req.body.user_id);
            const user = await User.findOne({
                where: { 
                    user_id: req.body.user_id
                }
            });

            if (!user) {
                console.log('User not found:', req.body.user_id);
                // Delete uploaded files if user not found
                if (req.files) {
                    Object.values(req.files).forEach(fileArray => {
                        fileArray.forEach(file => {
                            if (fs.existsSync(file.path)) {
                                fs.unlinkSync(file.path);
                                console.log('Deleted file:', file.path);
                            }
                        });
                    });
                }
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            console.log('Found user:', {
                id: user.id,
                user_id: user.user_id,
                name: user.name
            });

            // Check if all required files are present
            if (!req.files || !req.files.aadhar_front || !req.files.aadhar_back || !req.files.pan_front) {
                console.log('Missing required files. Received:', req.files ? Object.keys(req.files) : 'No files');
                // Delete any uploaded files
                if (req.files) {
                    Object.values(req.files).forEach(fileArray => {
                        fileArray.forEach(file => {
                            if (fs.existsSync(file.path)) {
                                fs.unlinkSync(file.path);
                                console.log('Deleted file:', file.path);
                            }
                        });
                    });
                }
                return res.status(400).json({
                    success: false,
                    message: 'All document files (aadhar_front, aadhar_back, pan_front) are required'
                });
            }

            // Update user profile with KYC details
            const updateData = {
                aadhar_number: req.body.aadhar_number,
                pan_number: req.body.pan_number,
                aadhar_front_path: req.files.aadhar_front[0].path.replace(/\\/g, '/'),
                aadhar_back_path: req.files.aadhar_back[0].path.replace(/\\/g, '/'),
                pan_front_path: req.files.pan_front[0].path.replace(/\\/g, '/'),
                kyc_status: 'Submitted',

                kyc_submitted_at: new Date()
            };

            console.log('Attempting to update user with:', updateData);

            try {
                await user.update(updateData);
                console.log('User updated successfully');
            } catch (updateError) {
                console.error('Error updating user:', {
                    name: updateError.name,
                    message: updateError.message,
                    errors: updateError.errors
                });
                throw updateError;
            }

            res.status(200).json({
                success: true,
                message: 'KYC details submitted successfully',
                data: {
                    user_id: user.user_id,
                    kyc_status: 'Submitted'
                }
            });

        } catch (error) {
            console.error('KYC submission error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack,
                errors: error.errors
            });
            
            // Delete uploaded files if any error occurs
            if (req.files) {
                Object.values(req.files).forEach(fileArray => {
                    fileArray.forEach(file => {
                        if (fs.existsSync(file.path)) {
                            fs.unlinkSync(file.path);
                            console.log('Deleted file:', file.path);
                        }
                    });
                });
            }

            // Send more specific error message based on the error type
            let errorMessage = 'Error processing KYC submission. Please try again.';
            if (error.name === 'SequelizeValidationError') {
                errorMessage = 'Invalid data format. Please check your input.';
            } else if (error.name === 'SequelizeUniqueConstraintError') {
                errorMessage = 'This Aadhar or PAN number is already registered.';
            }

            res.status(500).json({
                success: false,
                message: errorMessage
            });
        }
    }
);

// Define routes
router.get('/allmembers', userController.getAllMembers);
router.post("/register", userController.registerUser);
router.post('/login', userController.login);
router.post('/prelogin', userController.prelogin);
router.put('/members/:id/status', userController.updateMemberStatus);
router.get('/members/:id', userController.viewMember);
router.delete('/members/:id', userController.deleteMember);

module.exports = router;
