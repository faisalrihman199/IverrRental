const jwtService = require('./jwtService');

let clients = {};  // Stores all connected WebSocket clients

// Event Types - Defining events inside the service
const socketEvents = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  SEND_MESSAGE: 'sendMessage',
  NOTIFY: 'notify',
  UNREAD_MESSAGES_COUNT: 'unreadMessagesCount',
  JOIN_GROUP: 'joinGroup',
  LEAVE_GROUP: 'leaveGroup',
};

// Handle WebSocket connection
const handleSocketConnection = async (ws, req) => {
  const token = new URL(req.url, `http://${req.headers.host}`).searchParams.get('token');
  const user = jwtService.verifyToken(token);

  if (!user) {
    ws.send(JSON.stringify({ message: 'Invalid token' }));
    return ws.close();
  }

  const clientId = user.id;
  clients[clientId] = ws;
  console.log(`New client connected: ${clientId}`);

  // Send a welcome message on connection
  ws.send(JSON.stringify({ event: socketEvents.CONNECT, message: 'Welcome to the WebSocket server!' }));


  // Handle client disconnection
  ws.on('close', () => {
    console.log(`Client ${clientId} disconnected`);
    delete clients[clientId];  // Remove client from the clients object
  });
};

// Export the clients object, socketEvents, and handleSocketConnection function
module.exports = { handleSocketConnection, clients, socketEvents };
