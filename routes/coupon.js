const express = require("express");
const router = express.Router();
const upload = require("../middleware/multerConfig");
const controllers = require("../controllers/index");
const adminAuth = require("../middleware/adminAuth");
const auth = require("../middleware/authMiddleware");

// Save or Update Coupon
router.post("/save", adminAuth, upload("coupons").single("image"), controllers.coupon.saveCoupon);
router.get("/",auth, controllers.coupon.getCoupons);
router.get("/code",auth, controllers.coupon.getCode);
router.delete("/delete", adminAuth, controllers.coupon.deleteCoupon);

module.exports = router;
