const express = require('express');
const messageController = require("../controllers/messageController");
const router = express.Router();

// Message management routes
router.get('/allmessages', messageController.getAllMessages);
router.get('/members', messageController.getAllMembers);
router.get('/notification/:id', messageController.notification);
router.get('/unread-count/:id', messageController.unreadCount);
router.post('/mark-as-read', messageController.markAsRead);
router.post('/create', messageController.createMessage);
router.get('/:id', messageController.getMessage);
router.put('/:id', messageController.updateMessage);
router.delete('/:id', messageController.deleteMessage);
    
module.exports = router;
