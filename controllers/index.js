const auth = require("./authController")
const otp = require("./otpController")
const admin = require("./adminController")
const banner = require("./bannerController")
const city = require("./cityController")
const carType = require("./carTypeController")
const carBrand = require("./carBrandController")
const gallery = require("./galleryController")
const faq = require("./faqController")
const facility = require("./facilityController")
const coupon = require("./couponController")
const car = require("./carController")
const  favouriteCars= require("./favouritesCarController")
const controllers = {admin,auth,otp,banner,city, carType,carBrand,gallery,faq,facility,coupon,car,favouriteCars}

module.exports = controllers
