const express = require("express");
const router = express.Router();
const upload = require("../middleware/multerConfig");
const controllers = require("../controllers/index");
const auth = require("../middleware/authMiddleware");

// Save or Update Car (if id is provided, update)
router.post("/save", auth, upload("cars").array("images", 10), controllers.car.saveCar);
// Get all cars
router.get("/", auth, controllers.car.getCars);
router.get("/options", auth, controllers.car.getOptions);

// Delete a car
router.delete("/delete", auth, controllers.car.deleteCar);
router.delete("/remove_image", auth, controllers.car.removeCarImage);
router.post("/add_images", auth,upload("cars").array("images", 10), controllers.car.addCarImages);

module.exports = router;
