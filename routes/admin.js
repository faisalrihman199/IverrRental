var express = require('express');
var router = express.Router();
var controllers = require("../controllers/index")
const adminAuth = require('../middleware/adminAuth');

router.post('/register', controllers.admin.register);
router.get('/dashboard',adminAuth, controllers.admin.dashboardData);

module.exports = router