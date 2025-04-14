const { clients, socketEvents } = require('../services/webSocketService');  // Import WebSocket service and event types
const models=require('../models');
// Send a notification to a specific client
const sendNotificationToClient = (clientId, notification) => {
  const clientSocket = clients[clientId];

  if (clientSocket && clientSocket.readyState === WebSocket.OPEN) {
    clientSocket.send(JSON.stringify({
      event: socketEvents.NOTIFY,  // Use event type for clarity
      notification: notification
    }));
    console.log(`Notification sent to client ${clientId}: ${notification}`);
    return { success: true, message: `Notification sent to client ${clientId}: ${notification}` };
  } else {
    console.log(`Client ${clientId} is not connected or has closed the connection.`);
    return { success: false, message: 'Notification sending failed' };
  }
};

// Controller function to trigger message sending
const send = async (req, res) => {
  try {
    const { id, message } = req.query;  // Get clientId and message from query params
    console.log("Sending message to:", id, message);

    const result = sendNotificationToClient(id, message);
    return res.status(200).json(result);  // Return the result as a JSON response
  } catch (error) {
    console.error("Error sending message:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};
const addNotification = async (data) => {
  
  try {
      // Create a new notification in the database using the data object
      const newNotification = await models.Notification.create({
          userId: data.userId,
          type: data.type,
          heading: data.heading,
          content: data.content,
          status: data.status,
      });
      sendNotificationToClient(data.userId, newNotification);

      return newNotification;  // Return the created notification
  } catch (error) {
      console.error('Error creating notification:', error);
      throw new Error('Failed to create notification');
  }
};

const createNotification = async (req, res) => {
  try {
      const { userId, type, heading, content, status } = req.body;  // Extract notification data from request body

      // Validate required fields
      if (!userId || !type || !heading || !content || !status) {
          return res.status(400).json({ success: false, message: 'All fields (userId, type, heading, content, status) are required' });
      }

      // Create the notification by calling the addNotification service function
      const notificationData = { userId, type, heading, content, status };
      const newNotification = await addNotification(notificationData);

      // Respond with the created notification
      return res.status(201).json({
          success: true,
          message: 'Notification created successfully',
          data: newNotification,
      });
  } catch (error) {
      console.error('Error creating notification:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


const updateStatus = async (req, res) => {
  try {
      const { notificationId, status } = req.query;  // Get notificationId and status from query params

      // Validate the required fields
      if (!notificationId || !status) {
          return res.status(400).json({ success: false, message: 'notificationId and status are required' });
      }

      // Find the notification by its ID
      const notification = await models.Notification.findOne({ where: { id: notificationId } });

      if (!notification) {
          return res.status(404).json({ success: false, message: 'Notification not found' });
      }

      // Update the status of the notification
      notification.status = status;
      await notification.save();

      // Respond with the updated notification
      return res.status(200).json({
          success: true,
          message: 'Notification status updated successfully',
          data: notification,
      });
  } catch (error) {
      console.error('Error in updateStatus:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Controller function to fetch notifications for the authenticated user
const getNotifications = async (req, res) => {
  try {
      const userId = req.user.id;  // Get the userId from the authenticated user (attached by middleware)

      // Fetch notifications for the current user
      const notifications = await models.Notification.findAll({
          where: { userId },
          order: [['createdAt', 'DESC']],  // Order notifications by creation date (most recent first)
      });

      // Respond with the notifications
      return res.status(200).json({
          success: true,
          data: notifications,
      });
  } catch (error) {
      console.error('Error in getNotifications:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {  sendNotificationToClient, send, getNotifications,updateStatus, addNotification, createNotification };
