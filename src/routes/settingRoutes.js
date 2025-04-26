const express = require('express');
const settingController = require("../controllers/settingController");
const router = express.Router();

router.get('/general', settingController.renderGeneralSetting);
router.post('/general', settingController.updateGeneralSettings);

router.get('/referral', settingController.renderReferralSetting);
router.post('/referral', settingController.updateReferralSettings);



module.exports = router;
