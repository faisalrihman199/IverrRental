var express = require('express');
var router = express.Router();
var adminAuth = require('../middleware/adminAuth');
var auth = require('../middleware/authMiddleware');
var upload = require('../middleware/multerConfig');
const controllers = require('../controllers/index');
const makeVisitor = require('../middleware/visitor');

// Save or Update Gallery Image (if id is provided, update)
router.post("/save", adminAuth, upload("gallery").array("image", 10), controllers.gallery.saveGalleryImage);
router.post("/add_images", auth, upload("gallery").array("image", 10), controllers.gallery.addGalleryImages);

// Get All Gallery Images
router.get("/", makeVisitor, controllers.gallery.getGalleryImages);

// Delete Gallery Image
router.delete("/delete", adminAuth, controllers.gallery.deleteGalleryImage);
router.delete("/remove_image", auth, controllers.gallery.removeGalleryImage);

module.exports = router;
