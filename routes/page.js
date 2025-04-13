var express = require('express');
var router = express.Router();
var adminAuth = require('../middleware/adminAuth');
var auth = require('../middleware/authMiddleware');
const controllers = require("../controllers");
const makeVisitor = require('../middleware/visitor');

// Save or Update FAQ (if id is provided, update)
router.post("/save", adminAuth, controllers.page.savePage);

// Get All FAQs or by ID or Status
router.get("/", makeVisitor, controllers.page.getPages);

// Delete FAQ
router.delete("/delete", adminAuth, controllers.page.deletePage);

module.exports = router;
