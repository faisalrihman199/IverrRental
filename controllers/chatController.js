// controllers/messageController.js
const { Op }      = require('sequelize');
const models       = require('../models');
const Conversation = models.Conversation;
const Message      = models.Message;
const User=models.User;

const sequelize    = models.sequelize;
const { clients }  = require('../services/webSocketService');
const WebSocket    = require('ws');
const { sendMessage,chatNotify } = require('./notificationController');

function notifyOtherUser(id, notification){
  chatNotify(id,notification);
}

exports.addMessage = async (req, res) => {
  // wrap DB ops in a nested try/catch to separate transaction errors
  const t = await sequelize.transaction();
  let message;
  let delivered = false;
  try {
    const senderId   = req.user.id;
    const { conversationId } = req.query;
    const { content, receiverId, replied } = req.body;

    if (!receiverId) {
      throw { status: 400, message: 'receiverId is required' };
    }

    // 1) Find or create conversation
    let convo;
    if (conversationId) {
      convo = await Conversation.findByPk(conversationId, { transaction: t });
      if (!convo) throw { status: 404, message: 'Conversation not found.' };
    } else {
      convo = await Conversation.findOne({
        where: {
          [Op.or]: [
            { createdBy: senderId, createdFor: receiverId },
            { createdBy: receiverId, createdFor: senderId }
          ]
        },
        transaction: t
      });
      if (!convo) {
        convo = await Conversation.create({
          status:    'open',
          createdBy: senderId,
          createdFor: receiverId
        }, { transaction: t });
      }
    }

    // 2) Optional file upload
    let fileUrl = null;
    if (req.file) {
      fileUrl = `/uploads/messages/${req.file.filename}`;
    }

    // 3) Create message
    message = await Message.create({
      content,
      file:           fileUrl,
      status:         'sent',
      deleted:        'none',
      sender:         senderId,
      receiver:       receiverId,
      replied:        replied || null,
      conversationId: convo.id
    }, { transaction: t });

    // 4) Update conversation.lastMessage
    convo.lastMessage = content || fileUrl;
    await convo.save({ transaction: t });

    // 5) Check socket, set delivered status within transaction
    const clientSocket = clients[receiverId];
    if (clientSocket && clientSocket.readyState === WebSocket.OPEN) {
      message.status = 'delivered';
      await message.save({ transaction: t });
      delivered = true;
    }

    // commit DB changes
    await t.commit();
  } catch (err) {
    await t.rollback();
    console.error('Transaction error in addMessage:', err);
    const status = err.status || 500;
    return res.status(status).json({ success: false, message: err.message || 'Internal server error.' });
  }

  const payload = message.get({ plain: true });
  sendMessage(message.receiver, payload);

  // 7) Return response
  return res.status(201).json({ success: true, data: payload, delivered });
};

exports.getAllConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    const convos = await Conversation.findAll({
      where: {
        [Op.or]: [
          { createdBy: userId },
          { createdFor: userId }
        ]
      },
      include: [
        { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'image'] },
        { model: User, as: 'recipient', attributes: ['id', 'firstName', 'lastName', 'image'] }
      ],
      order: [['updatedAt', 'DESC']]
    });

    const conversations = convos.filter(c => {
      // Log the fields to ensure the values are correct
      console.log(`Conversation ID: ${c.id}`);
      console.log(`Deleted By Owner: ${c.status}`);
      console.log(`Deleted By Recipient: ${c.deletedByRecipient}`);

      // Check if the current user has deleted the conversation
      if (c.createdBy === userId && c.status === 'deletedByOwner') {
        console.log(`Excluding conversation ${c.id} - deleted by owner`);
        return false; // Exclude this conversation if deleted by the owner
      }
      if (c.createdFor === userId && c.status === 'deletedByRecipient') {
        console.log(`Excluding conversation ${c.id} - deleted by recipient`);
        return false; // Exclude this conversation if deleted by the recipient
      }

      return true; // Include this conversation if not deleted by the current user
    }).map(c => {
      const otherUser = c.createdBy === userId ? c.recipient : c.owner;
      const name = `${otherUser?.firstName || ''} ${otherUser?.lastName || ''}`.trim();
      
      return {
        id: c.id,
        name,
        image: otherUser?.image || null,
        lastMessage: c.lastMessage,
        updatedAt: c.updatedAt
      };
    });

    return res.status(200).json({ success: true, data: { conversations } });

  } catch (err) {
    console.error('Error in getAllConversations:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};





exports.getOneChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const convoId = req.query.id;

    if (!convoId) {
      return res.status(400).json({ success: false, message: 'Conversation id is required' });
    }

    // Load conversation
    const convo = await Conversation.findByPk(convoId);
    if (!convo) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Ensure the conversation is not deleted for the user
    if (convo.status === 'deletedByOwner' && convo.createdBy === userId) {
      return res.status(404).json({ success: false, message: 'This conversation has been deleted' });
    }
    if (convo.status === 'deletedByRecipient' && convo.createdFor === userId) {
      return res.status(404).json({ success: false, message: 'This conversation has been deleted' });
    }

    // Ensure user is a participant
    if (convo.createdBy !== userId && convo.createdFor !== userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // Identify the other user
    const otherUserId = convo.createdBy === userId ? convo.createdFor : convo.createdBy;
    const otherUser = await User.findByPk(otherUserId, {
      attributes: ['id', 'firstName', 'lastName', 'image']
    });

    // Mark messages as read for the current user (only incoming messages)
    await Message.update(
      { status: 'read' },
      {
        where: {
          conversationId: convoId,
          receiver: userId,
          status: { [Op.ne]: 'read' }
        }
      }
    );

    // Get all messages in the conversation
    const allMessages = await Message.findAll({
      where: { conversationId: convoId },
      order: [['createdAt', 'ASC']]
    });

    // Apply deletion logic to the messages
    const messages = allMessages.map(msg => {
      const msgData = msg.toJSON();

      // Handle deletion for everyone
      if (msg.deleted === 'everyone') {
        msgData.content = 'This message has been deleted for Everyone';
        msgData.file = null;
      }
      // Handle deletion for the current user
      else if (msg.deleted === 'me' && (msg.sender === userId || msg.receiver === userId)) {
        msgData.content = 'This message has been deleted for You';
        msgData.file = null;
      }

      return msgData;
    });

    // Respond with the conversation details and messages
    res.status(200).json({
      success: true,
      data: {
        otherUser,
        messages
      }
    });

    // Notify the other user that all messages have been read
    notifyOtherUser(otherUserId, {
      conversationId: convoId,
      message: 'All messages read'
    });

  } catch (err) {
    console.error('Error in getOneChat:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};




exports.updateMessagesStatus = async (req, res) => {
  try {
    const { conversationId, status } = req.query;
    if (!conversationId || !status) {
      return res.status(400).json({ success: false, message: 'conversationId and status are required' });
    }
    const conversation=models.Conversation.findByPk(conversationId)
    const otherUserId=conversation.createdBy === req.user.id ? conversation.createdFor : conversation.createdBy;
    await Message.update(
      { status },
      { where: { conversationId } }
    );
    res.status(200).json({ success: true, message: 'Messages status updated successfully' });
    
    notifyOtherUser(otherUserId,{conversationId:conversationId,message: `Conversation all messages status ${status}`})

  } catch (err) {
    console.error('Error in updateMessagesStatus:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const { messageId, delete: delFlag } = req.query;

    // Validate input
    if (!messageId || !delFlag) {
      return res.status(400).json({ success: false, message: 'messageId and delete are required' });
    }

    if (!['me', 'everyone'].includes(delFlag)) {
      return res.status(400).json({ success: false, message: 'delete must be "me" or "everyone"' });
    }

    // Find the message
    const msg = await Message.findByPk(messageId);
    if (!msg) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    // Update the message's deleted flag
    await msg.update({ deleted: delFlag });
    res.status(200).json({ success: true, message: 'Message delete flag updated successfully' });

    // Find the conversation
    const conversation = await models.Conversation.findByPk(msg.conversationId);

    // Determine the other user
    const otherUserId = conversation.createdBy === req.user.id
      ? conversation.createdFor
      : conversation.createdBy;

    // Send response

    // Notify the other user
    if(delFlag==='everyone'){
      notifyOtherUser(otherUserId, {
        conversationId: conversation.id,
        message: 'A message was deleted in the conversation',
        data: msg
      });
    }

  } catch (err) {
    console.error('Error in deleteMessage:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};


exports.deleteConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.query;

    // Validate conversationId
    if (!conversationId) {
      return res.status(400).json({ success: false, message: 'Conversation ID is required' });
    }

    // Find the conversation
    const convo = await Conversation.findByPk(conversationId, {
      include: [
        { model: User, as: 'owner' },
        { model: User, as: 'recipient' }
      ]
    });

    if (!convo) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Check if the current user is either the owner or recipient
    if (convo.owner.id === userId) {
      // User is the owner, check if the recipient has already deleted
      if (convo.status === 'deletedByRecipient') {
        // Recipient has already deleted it, delete the conversation completely
        await Conversation.destroy({ where: { id: conversationId } });
        return res.status(200).json({ success: true, message: 'Conversation deleted by both parties' });
      } else {
        // If the conversation wasn't deleted by the recipient, mark it deleted for the owner
        await Conversation.update(
          { status: 'deletedByOwner' },
          { where: { id: conversationId } }
        );
      }
    } else if (convo.recipient.id === userId) {
      // User is the recipient, mark it deleted for the recipient
      await Conversation.update(
        { status: 'deletedByRecipient' },
        { where: { id: conversationId } }
      );
    } else {
      return res.status(403).json({ success: false, message: 'You are not authorized to delete this conversation' });
    }

    return res.status(200).json({ success: true, message: 'Conversation status updated successfully' });

  } catch (err) {
    console.error('Error in deleteConversation:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};



