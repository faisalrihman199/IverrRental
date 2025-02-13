const express = require("express");
const router = express.Router();
const upload = require("../middleware/multerConfig"); // Dynamic multer config
const controllers = require("../controllers/index");
const adminAuth = require('../middleware/adminAuth');
const auth = require('../middleware/authMiddleware');

router.post("/save", adminAuth, upload("facilities").single("image"), controllers.facility.saveFacility);
router.get("/",auth, controllers.facility.getFacilities);
router.delete("/delete", adminAuth, controllers.facility.deleteFacility);

module.exports = router;
