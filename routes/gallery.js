var express = require('express');
var router = express.Router();
var adminAuth = require('../middleware/adminAuth');
var auth = require('../middleware/authMiddleware');
var upload = require('../middleware/multerConfig');
const controllers = require('../controllers/index');

// Save or Update Gallery Image (if id is provided, update)
router.post("/save", adminAuth, upload("gallery").single("image"), controllers.gallery.saveGalleryImage);

// Get All Gallery Images
router.get("/", auth, controllers.gallery.getGalleryImages);

// Delete Gallery Image
router.delete("/delete", adminAuth, controllers.gallery.deleteGalleryImage);

module.exports = router;
