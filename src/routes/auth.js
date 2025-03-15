
const express = require("express");
const { showLoginForm, login, logout } = require("../controllers/adminController.js");
const router = express.Router();
const { verifyToken } = require("../middleware/auth.js");


// router.get('/login', renderLoginPage);
// router.post('/login', adminLogin);
// router.get('/dashboard', renderDashboard);

router.get('/login', showLoginForm);
router.post('/login', login);
router.get('/logout', verifyToken, logout);

module.exports = router;


