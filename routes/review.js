const express = require("express");
const router = express.Router();
const upload = require("../middleware/multerConfig");
const controllers = require("../controllers/index");
const adminAuth = require('../middleware/adminAuth');
const auth = require('../middleware/authMiddleware');
const visitor = require('../middleware/visitor');

// Save or Update Banner (if id is provided, update)
router.post("/save", auth, controllers.reviews.saveReview);
router.get("/", auth, controllers.reviews.getReviews);
router.delete("/delete", adminAuth, controllers.reviews.deleteReview);

module.exports = router;
