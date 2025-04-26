var express = require('express');
var router = express.Router();

var admin = require("./admin");
var auth = require("./auth");
var otp = require("./otp");
var banner = require("./banner");
var city = require("./city");
var carType = require("./carType");
var carBrand = require("./carBrand");
var gallery = require("./gallery");
var faq = require("./faq");
var facility = require("./facility");
var coupon = require("./coupon"); 
var car = require("./car"); 
var page = require("./page"); 
var booking = require("./booking"); 
var review = require("./review"); 
var insurance = require("./insurance"); 
var favouriteCars = require("./favouritecars"); 
var notifications = require("./notifications"); 
var calender = require("./calender"); 
var chat = require("./chat"); 

router.get('/', function(req, res, next) {
  res.send("Iverr Project is running");
});

router.use("/admin", admin);
router.use("/auth", auth);
router.use("/otp", otp);
router.use("/banner", banner);
router.use("/city", city);
router.use("/carType", carType);
router.use("/carBrand", carBrand);
router.use("/gallery", gallery);
router.use("/faq", faq);
router.use("/facility", facility);
router.use("/coupon", coupon); 
router.use("/car", car); 
router.use("/page", page); 
router.use("/booking", booking); 
router.use("/review", review); 
router.use("/insurance", insurance); 
router.use("/favouritecars", favouriteCars); 
router.use("/notifications", notifications); 
router.use("/calender", calender); 
router.use("/chat", chat); 

module.exports = router;
