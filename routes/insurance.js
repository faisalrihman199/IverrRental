const express = require("express");
const router = express.Router();
const upload = require("../middleware/multerConfig");
const controllers = require("../controllers/index");
const adminAuth = require('../middleware/adminAuth');
const auth = require('../middleware/authMiddleware');
const visitor = require('../middleware/visitor');

// Save or Update Banner (if id is provided, update)
router.post("/save", auth, controllers.Insurance.saveInsurance);
router.get("/", auth, controllers.Insurance.getInsurances);
router.delete("/delete", auth, controllers.Insurance.deleteInsurance);

module.exports = router;
