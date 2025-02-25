var express = require('express');
var router = express.Router();
var controllers = require("../controllers/index");
const authenticateToken = require('../middleware/authMiddleware');
const upload = require("../middleware/multerConfig");

router.post('/login', controllers.auth.login);
router.post('/register', controllers.auth.register);
router.post('/forgotPassword', controllers.auth.verifyOtpForPasswordReset);
router.post('/changePassword', authenticateToken,controllers.auth.changePassword);
router.get('/info', authenticateToken,controllers.auth.userInfo);
router.post('/update', authenticateToken,upload("users").single("image"),controllers.auth.updateUserInfo);
router.post('/changeEmail', authenticateToken,controllers.auth.changeEmail);

module.exports = router