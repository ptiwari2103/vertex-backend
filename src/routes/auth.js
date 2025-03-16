const express = require("express");
const { showLoginForm, login, logout } = require("../controllers/adminController.js");
const router = express.Router();
const { verifyToken } = require("../middleware/auth.js");

// Public routes
router.get('/login', showLoginForm);
router.post('/login', login);

// Protected routes
router.post('/logout', verifyToken, logout); // Changed to POST for security

module.exports = router;
