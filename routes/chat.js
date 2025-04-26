var express = require('express');
var router = express.Router();
var auth = require('../middleware/authMiddleware');
var upload = require('../middleware/multerConfig');
const controllers = require('../controllers/index');

// Save or Update Gallery Image (if id is provided, update)
router.post("/sendMessage", auth, upload("messages").single("file"), controllers.Chat.addMessage);
router.get("/all", auth,controllers.Chat.getAllConversations);
router.get("/one", auth,controllers.Chat.getOneChat);
router.get("/update_conversation", auth,controllers.Chat.updateMessagesStatus);
router.delete("/deleteMessage", auth,controllers.Chat.deleteMessage);
router.delete("/delete", auth,controllers.Chat.deleteConversation);

module.exports = router;
