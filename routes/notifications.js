var express = require('express');
var router = express.Router();
const controllers = require("../controllers");



router.get("/send", controllers.notifications.send);


module.exports = router;
