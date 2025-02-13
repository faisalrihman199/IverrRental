var express = require('express');
var router = express.Router();
var controllers = require("../controllers/index");
const authenticateToken = require('../middleware/authMiddleware');

router.post('/login', controllers.auth.login);
router.post('/register', controllers.auth.register);
router.post('/forgotPassword', controllers.auth.verifyOtpForPasswordReset);
router.patch('/changePassword', authenticateToken,controllers.auth.changePassword);

module.exports = router