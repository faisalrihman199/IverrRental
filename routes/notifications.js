var express = require('express');
var router = express.Router();
const controllers = require("../controllers");

const authenticateToken = require('../middleware/authMiddleware');


router.get("/send", controllers.notifications.send);
router.get("/",authenticateToken, controllers.notifications.getNotifications);
router.get("/update",authenticateToken, controllers.notifications.updateStatus);


module.exports = router;
