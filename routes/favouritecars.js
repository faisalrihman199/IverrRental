const express = require("express");
const router = express.Router();
const controllers = require("../controllers/index");
const auth = require('../middleware/authMiddleware');

// Save or Update Banner (if id is provided, update)
router.get("/save", auth, controllers.favouriteCars.updateFavourite);
router.get("/", auth, controllers.favouriteCars.getFavouriteCars);

module.exports = router;
