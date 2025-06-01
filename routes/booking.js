var express = require('express');
var router = express.Router();
var adminAuth = require('../middleware/adminAuth');
var auth = require('../middleware/authMiddleware');
const controllers = require("../controllers");
const upload = require("../middleware/multerConfig");
const uploader = upload();
const makeVisitor = require("../middleware/visitor");


// Save or Update FAQ (if id is provided, update)
router.post("/save", auth, uploader.fields([
    { name: "carPickDocs",     maxCount: 5 },
    { name: "personPickDocs",  maxCount: 5 },
    { name: "carDropDocs",     maxCount: 5 },
    { name: "personDropDocs",  maxCount: 5 },
  ]), controllers.booking.saveBooking);

// Get All FAQs or by ID or Status
router.get("/", auth, controllers.booking.getBookings);
router.get("/service_fee",makeVisitor, controllers.auth.serviceFee);
router.get("/coming", auth, controllers.booking.getComingBookings);

// Delete FAQ
router.delete("/delete", adminAuth, controllers.booking.deleteBooking);

module.exports = router;
