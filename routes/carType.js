const express = require("express");
const router = express.Router();
const upload = require("../middleware/multerConfig"); // Assuming you have a 'multerConfig' file for file uploads
const controllers = require("../controllers/index"); // Assuming your controller file exports all controllers
const adminAuth = require('../middleware/adminAuth');
const auth = require('../middleware/authMiddleware');

// Save or Update Car Type (if id is provided, update)
router.post("/save", adminAuth, upload("car_types").single("image"), controllers.carType.saveCarType);

// Get Car Types (can filter by id or status)
router.get("/", auth, controllers.carType.getCarTypes);

// Delete Car Type (by id)
router.delete("/delete", adminAuth, controllers.carType.deleteCarType);

module.exports = router;
