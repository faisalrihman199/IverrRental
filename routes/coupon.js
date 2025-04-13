const express = require("express");
const router = express.Router();
const upload = require("../middleware/multerConfig");
const controllers = require("../controllers/index");
const adminAuth = require("../middleware/adminAuth");
const auth = require("../middleware/authMiddleware");
const makeVisitor = require("../middleware/visitor");

// Save or Update Coupon
router.post("/save", adminAuth, upload("coupons").single("image"), controllers.coupon.saveCoupon);
router.get("/",makeVisitor, controllers.coupon.getCoupons);
router.get("/code",makeVisitor, controllers.coupon.getCode);
router.delete("/delete", adminAuth, controllers.coupon.deleteCoupon);

module.exports = router;
