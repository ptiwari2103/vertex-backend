const express = require("express");
const { verifyToken, isAdmin } = require("../middleware/auth.js");
const { getDashboard } = require("../controllers/dashboardController.js");

const router = express.Router();

// Protected dashboard route
router.get('/', verifyToken, isAdmin, getDashboard);

module.exports = router;
