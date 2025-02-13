var express = require('express');
var router = express.Router();
var upload = require("../middleware/multerConfig");
var adminAuth = require("../middleware/adminAuth");
var auth = require("../middleware/authMiddleware");
const controllers = require("../controllers/index");

// Save or Update Car Brand (if id is provided, update)
router.post("/save", adminAuth, upload("car_brands").single("image"), controllers.carBrand.saveCarBrand);

// Get All Car Brands (with optional id or status in query)
router.get("/", auth, controllers.carBrand.getCarBrands);

// Delete Car Brand and Remove Image File (requires id)
router.delete("/delete", adminAuth, controllers.carBrand.deleteCarBrand);

module.exports = router;
