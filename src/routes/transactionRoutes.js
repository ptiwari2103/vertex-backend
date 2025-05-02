const express = require('express');
const { verifyToken, isAdmin } = require('../middleware/auth.js');
const transactionController = require('../controllers/transactionController');

const router = express.Router();

// Admin transactions list route
router.get('/list', verifyToken, isAdmin, transactionController.getAllTransactions);

module.exports = router;
