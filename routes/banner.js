const express = require("express");
const router = express.Router();
const upload = require("../middleware/multerConfig");
const controllers = require("../controllers/index");
const adminAuth = require('../middleware/adminAuth');
const auth = require('../middleware/authMiddleware');
const visitor = require('../middleware/visitor');

// Save or Update Banner (if id is provided, update)
router.post("/save", adminAuth, upload("banners").single("image"), controllers.banner.saveBanner);
router.get("/", visitor, controllers.banner.getBanners);
router.delete("/delete", adminAuth, controllers.banner.deleteBanner);

module.exports = router;
