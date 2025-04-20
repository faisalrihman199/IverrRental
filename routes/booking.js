var express = require('express');
var router = express.Router();
var adminAuth = require('../middleware/adminAuth');
var auth = require('../middleware/authMiddleware');
const controllers = require("../controllers");

// Save or Update FAQ (if id is provided, update)
router.post("/save", auth, controllers.booking.saveBooking);

// Get All FAQs or by ID or Status
router.get("/", auth, controllers.booking.getBookings);
router.get("/service_fee", controllers.auth.serviceFee);
router.get("/coming", auth, controllers.booking.getComingBookings);

// Delete FAQ
router.delete("/delete", adminAuth, controllers.booking.deleteBooking);

module.exports = router;
