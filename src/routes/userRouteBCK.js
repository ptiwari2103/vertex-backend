const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { body } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');
const { User, State, District } = require('../models');

// Custom validation for name fields (only characters and spaces)
const nameRegex = /^[A-Za-z\s]+$/;

// Address validation regex (allows alphanumeric, spaces, commas, hyphens, periods, hash)
const addressRegex = /^[a-zA-Z0-9\s,.-#/]+$/;

// Password validation regex
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;

// Email validation regex
const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Pincode validation regex (6 digits)
const pincodeRegex = /^[1-9][0-9]{5}$/;

// Common disposable email domains
const disposableEmailDomains = [
    'tempmail.com', 'throwawaymail.com', 'mailinator.com', 'guerrillamail.com',
    'temp-mail.org', '10minutemail.com', 'yopmail.com', 'trashmail.com'
];

// Calculate age from date
const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate.split('-').reverse().join('-'));
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

// Custom address validation
const validateAddress = (value, fieldName) => {
    // Remove extra spaces and normalize line endings
    value = value.replace(/[\s\u00A0]+/g, ' ').trim();
    
    // Check for minimum length
    if (value.length < 10) {
        throw new Error(`${fieldName} must be at least 10 characters long`);
    }
    
    // Check for maximum length
    if (value.length > 200) {
        throw new Error(`${fieldName} cannot exceed 200 characters`);
    }
    
    // Check for valid characters
    if (!addressRegex.test(value)) {
        throw new Error(`${fieldName} can only contain letters, numbers, spaces, and basic punctuation (comma, period, hyphen, hash, forward slash)`);
    }
    
    // Check for at least 2 parts (street and area/locality)
    const parts = value.split(',').map(part => part.trim()).filter(part => part.length > 0);
    if (parts.length < 2) {
        throw new Error(`${fieldName} must include at least street address and area/locality, separated by commas`);
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

    // Email validation
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .matches(emailRegex).withMessage('Invalid email format')
        .normalizeEmail()
        .custom(async (value) => {
            // Check email length
            if (value.length > 100) {
                throw new Error('Email cannot exceed 100 characters');
            }
            
            // Check for disposable email domains
            const domain = value.split('@')[1].toLowerCase();
            if (disposableEmailDomains.includes(domain)) {
                throw new Error('Disposable email addresses are not allowed');
            }
            
            // Check for common email patterns
            if (value.split('@')[0].length < 3) {
                throw new Error('Email username must be at least 3 characters long');
            }
            
            // Check if email already exists
            const existingUser = await User.findOne({ where: { email: value } });
            if (existingUser) {
                throw new Error('This email address is already registered');
            }
            
            return true;
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
        .isIn(['male', 'female', 'transgender']).withMessage('Gender must be male, female, or transgender')
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

    // Address validation
    body('address')
        .trim()
        .notEmpty().withMessage('Address is required')
        .custom((value) => validateAddress(value, 'Address'))
        .customSanitizer(value => {
            // Normalize spaces and commas
            return value.replace(/[\s\u00A0]+/g, ' ')
                       .replace(/\s*,\s*/g, ', ')
                       .trim();
        }),

    // City validation
    body('city')
        .trim()
        .notEmpty().withMessage('City is required')
        .matches(nameRegex).withMessage('City can only contain letters and spaces')
        .isLength({ min: 2, max: 50 }).withMessage('City must be between 2 and 50 characters')
        .customSanitizer(value => {
            // Capitalize first letter of each word
            return value.replace(/[\s\u00A0]+/g, ' ').trim().split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
        }),

    // Pincode validation
    body('pincode')
        .matches(pincodeRegex).withMessage('Pincode must be a valid 6-digit number starting with non-zero digit'),

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

// Define routes
router.get("/users", userController.getAllUsers);
router.post("/users/register", registerValidation, userController.registerUser);

module.exports = router;
