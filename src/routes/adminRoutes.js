
const express = require("express");
const { renderLoginPage, adminLogin, renderDashboard } = require("../controllers/adminController.js");

const router = express.Router();

router.get('/login', renderLoginPage);
router.post('/login', adminLogin);
router.get('/dashboard', renderDashboard);


module.exports = router;


