const express = require("express");
const router = express.Router();
const controllers = require("../controllers/index");
const auth = require('../middleware/authMiddleware');
const adminAuth = require('../middleware/adminAuth');
const makeVisitor = require("../middleware/visitor");

// Save or Update Banner (if id is provided, update)
router.post("/save", adminAuth, controllers.city.saveCity);
router.get("/", makeVisitor, controllers.city.getCities);
router.delete("/delete", adminAuth, controllers.city.deleteCity);

module.exports = router;
