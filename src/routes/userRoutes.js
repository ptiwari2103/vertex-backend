const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { body, validationResult } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');
const { User, State, District } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Custom validation for name fields (only characters and spaces)
const nameRegex = /^[A-Za-z\s]+$/;

// Password validation regex
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;

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

// Date format validation (dd-mm-yyyy)
const isValidDate = (value) => {
    const regex = /^(\d{2})-(\d{2})-(\d{4})$/;
    if (!regex.test(value)) return false;

    const [_, day, month, year] = regex.exec(value);

    // Check for valid month (1-12)
    if (month < 1 || month > 12) return false;

    // Check for valid year (not before 1900)
    if (year < 1900) return false;

    const date = new Date(year, month - 1, day);
    return date.getDate() === parseInt(day) &&
        date.getMonth() === parseInt(month) - 1 &&
        date.getFullYear() === parseInt(year);
};

// Custom name validation
const validateName = (value, fieldName) => {
    // Remove extra spaces and non-breaking spaces
    value = value.replace(/[\s\u00A0]+/g, ' ').trim();

    // Check for minimum length (2 characters)
    if (value.length < 2) {
        throw new Error(`${fieldName} must be at least 2 characters long`);
    }

    // Check for maximum length (50 characters)
    if (value.length > 50) {
        throw new Error(`${fieldName} cannot exceed 50 characters`);
    }

    // Check for valid characters
    if (!nameRegex.test(value)) {
        throw new Error(`${fieldName} can only contain letters and spaces. No numbers, special characters, or symbols allowed.`);
    }

    // Check for at least two words for full name
    if (fieldName === 'Name') {
        const words = value.split(' ').filter(word => word.length > 0);
        if (words.length < 2) {
            throw new Error('Please provide both first and last name');
        }
        // Check each word's length
        words.forEach(word => {
            if (word.length < 2) {
                throw new Error('Each name part must be at least 2 characters long');
            }
        });
    }

    return true;
};

// Validation middleware for user registration
const registerValidation = [
    // Name validation
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .custom((value) => validateName(value, 'Name'))
        .customSanitizer(value => {
            // Capitalize first letter of each word and normalize spaces
            return value.replace(/[\s\u00A0]+/g, ' ').trim().split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
        }),

    // Guardian name validation
    body('guardian_name')
        .trim()
        .notEmpty().withMessage('Guardian name is required')
        .custom((value) => validateName(value, 'Guardian name'))
        .customSanitizer(value => {
            // Capitalize first letter of each word and normalize spaces
            return value.replace(/[\s\u00A0]+/g, ' ').trim().split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
        }),

    // Password validation
    body('password')
        .matches(passwordRegex)
        .withMessage('Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*)')
        .custom((value) => {
            // Additional password checks
            if (value.length > 50) {
                throw new Error('Password cannot exceed 50 characters');
            }
            if (/(.)\1{2,}/.test(value)) {
                throw new Error('Password cannot contain repeating characters more than twice in a row');
            }
            return true;
        }),

    // Date of birth validation
    body('date_of_birth')
        .notEmpty().withMessage('Date of birth is required')
        .custom((value) => {
            if (!isValidDate(value)) {
                throw new Error('Invalid date format. Use dd-mm-yyyy');
            }
            const [day, month, year] = value.split('-');
            if (parseInt(year) < 1900) {
                throw new Error('Year must be 1900 or later');
            }
            // Check if date is not in future
            const inputDate = new Date(year, month - 1, day);
            if (inputDate > new Date()) {
                throw new Error('Date of birth cannot be in the future');
            }
            // Check minimum age (18 years)
            const age = calculateAge(value);
            if (age < 18) {
                throw new Error('You must be at least 18 years old to register');
            }
            return true;
        }),

    // Gender validation
    body('gender')
        .trim()
        .notEmpty().withMessage('Gender is required')
        .isIn(['Male', 'Female', 'Transgender']).withMessage('Gender must be male, female, or transgender')
        .customSanitizer(value => value.toLowerCase()),

    // Mobile number validation
    body('mobile_number')
        .matches(/^[0-9]{10}$/).withMessage('Mobile number must be 10 digits')
        .custom(async (value) => {
            // Check for repeating digits
            if (/(.)\1{7,}/.test(value)) {
                throw new Error('Mobile number cannot have more than 7 repeating digits');
            }
            // Check for sequential digits
            if (/0123456789|1234567890|9876543210/.test(value)) {
                throw new Error('Mobile number cannot be sequential');
            }

            // Check if mobile number already exists
            const existingUser = await User.findOne({ where: { mobile_number: value } });
            if (existingUser) {
                throw new Error('This mobile number is already registered');
            }

            return true;
        }),

    // State validation
    body('state')
        .isInt({ min: 1 }).withMessage('State ID must be a positive number')
        .notEmpty().withMessage('State ID is required')
        .custom(async (value) => {
            // Check if state exists
            const state = await State.findByPk(value);
            if (!state) {
                throw new Error('Invalid state ID');
            }
            return true;
        }),

    // District validation
    body('district')
        .isInt({ min: 1 }).withMessage('District ID must be a positive number')
        .notEmpty().withMessage('District ID is required')
        .custom(async (value, { req }) => {
            // Check if district exists and belongs to the selected state
            const district = await District.findOne({
                where: {
                    id: value,
                    state_id: req.body.state
                }
            });

            if (!district) {
                throw new Error('Invalid district ID or district does not belong to the selected state');
            }
            return true;
        }),

    // Terms accepted validation
    body('terms_accepted')
        .isBoolean().withMessage('Terms accepted must be true or false')
        .custom((value) => {
            if (value !== true) {
                throw new Error('You must accept the terms and conditions');
            }
            return true;
        }),

    validateRequest
];

// Login validation middleware
const loginValidation = [
    body('user_id')
        .notEmpty().withMessage('User ID is required')        
        .custom(async (value) => {            
            const user = await User.findOne({ where: { user_id: value, user_type: 'member' } }); 
            if (!user) {
                throw new Error('Invalid User ID or password');
            }
            return true;
        }),
    body('password')
        .notEmpty().withMessage('Password is required'),
    validateRequest
];

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

// Login route
router.post('/users/login', loginValidation, async (req, res) => {
    try {
        const { user_id, password } = req.body;

        // Find user by user_id (already converted to integer by validation)
        // const user = await User.findOne({
        //     where: { user_id },
        //     include: [
        //         { model: State, as: 'stateDetails' },
        //         { model: District, as: 'districtDetails' }
        //     ],
        //     attributes: { 
        //         exclude: ['terms_accepted', 'kyc_status']
        //     }
        // });

        const user = await User.findOne({ where: { user_id: user_id, user_type: 'member' } }); 

        // Check if user exists and verify password
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({
                success: false,
                message: 'Invalid User ID or password'
            });
        }

        // Check user status
        if (user.status !== 'Active') {
            return res.status(401).json({
                success: false,
                message: `Your account is currently ${user.status.toLowerCase()}. Please contact support.`
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                user_id: user.user_id,
                account_number: user.account_number,
                user_type: user.user_type
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Remove password from response
        const userResponse = user.toJSON();
        delete userResponse.id;
        delete userResponse.password;
        delete userResponse.user_type;
        delete userResponse.district;        
        delete userResponse.state;
        delete userResponse.created_date;
        delete userResponse.updated_date;
        
        // Return user details and token
        res.json({
            success: true,
            data: {
                user: userResponse,
                token
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error
        });
    }
});

// KYC form submission route
router.post('/users/kyc',
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
router.get("/users", userController.getAllUsers);
router.post("/users/register", registerValidation, userController.registerUser);

module.exports = router;
