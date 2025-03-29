const express = require('express');
const messageController = require("../controllers/messageController");
const router = express.Router();

// Message management routes
router.get('/allmessages', messageController.getAllMessage);
router.post('/create', messageController.createMessage);
    
module.exports = router;
