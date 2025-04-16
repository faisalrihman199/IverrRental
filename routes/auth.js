var express = require('express');
var router = express.Router();
var controllers = require("../controllers/index");
const authenticateToken = require('../middleware/authMiddleware');
const adminAuth=require('../middleware/adminAuth')
const upload = require("../middleware/multerConfig");
const uploader = upload("users");



router.post('/login', controllers.auth.login);
router.post('/register', controllers.auth.register);
router.post('/forgotPassword', controllers.auth.verifyOtpForPasswordReset);
router.post('/changePassword', authenticateToken,controllers.auth.changePassword);
router.get('/info', authenticateToken,controllers.auth.userInfo);
router.get('/updateStatus', adminAuth,controllers.auth.updateUserStatus);
router.get('/users', adminAuth,controllers.auth.getNonAdminUsers);
router.delete('/delete', authenticateToken,controllers.auth.deleteUserAccount);
router.post('/changeEmail', authenticateToken,controllers.auth.changeEmail);


router.post('/update', authenticateToken,uploader.fields([{ name: "image",maxCount: 1 }, // profile pic
    { name: "cnicOrPassport", maxCount: 1 },
    { name: "drivingLicense", maxCount: 1 },
    { name: "companyDoc",     maxCount: 1 },
  ]),
  // <-- map the image array back to req.file so your controller is unchanged
  (req, res, next) => {
    if (req.files.image) req.file = req.files.image[0];
    next();
  },controllers.auth.updateUserInfo);


module.exports = router