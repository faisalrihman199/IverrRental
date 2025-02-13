const express = require("express");
const router = express.Router();
const upload = require("../middleware/multerConfig");
const controllers = require("../controllers/index");
const auth = require("../middleware/authMiddleware");

// Save or Update Car (if id is provided, update)
router.post("/save", auth, upload("cars").single("image"), controllers.car.saveCar);

// Get all cars
router.get("/", auth, controllers.car.getCars);

// Delete a car
router.delete("/delete", auth, controllers.car.deleteCar);

module.exports = router;
