var express = require('express');
var router = express.Router();
var controllers = require("../controllers/index")

router.post('/register', controllers.admin.register);

module.exports = router