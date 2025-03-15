const express = require("express");

const { getDashboard } = require("../controllers/dashboardController.js");

const router = express.Router();

router.get('/', getDashboard);

module.exports = router;
