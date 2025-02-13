var express = require('express');
var router = express.Router();
var controllers = require("../controllers/index")

router.post('/send', controllers.otp.sendOtp);
router.post('/verify', controllers.otp.verifyOTP);

module.exports = router