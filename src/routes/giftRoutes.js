const express = require('express');
const giftController = require("../controllers/giftController");
const router = express.Router();

router.get('/list', giftController.renderGiftList);
router.get('/add', giftController.renderAddGift);
router.post('/create', giftController.createGift);

router.post('/distributor-login', giftController.distributorLogin);
router.get('/member-gift-list', giftController.memberGiftList);
router.post('/distribute', giftController.distribute);


// Place these BEFORE any routes with :id
router.get('/distributor', giftController.renderDistributorList);
router.post('/distributor/create', giftController.createDistributor);
router.delete('/distributor/:id', giftController.deleteDistributor);
router.post('/distributor/:id/status', giftController.updateDistributorStatus);
router.get('/received', giftController.renderReceivedList);
router.post('/received/create', giftController.createReceived);
router.get('/admin-received', giftController.adminReceivedList);
router.post('/member/gift-status', giftController.memberGiftStatus);


// Generic routes
router.get('/:id/edit', giftController.renderEditGift);
router.post('/:id/update', giftController.updateGift);
router.get('/:id', giftController.getGift);
router.put('/:id', giftController.updateGift);
router.delete('/:id', giftController.deleteGift);


module.exports = router;
