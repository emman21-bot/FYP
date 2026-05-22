const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { Server } = require('socket.io');

let io;

const joinUserRoom = async (socket, token) => {
  if (!token) {
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.id) {
      return;
    }

    const user = await User.findById(decoded.id).select('_id');
    if (!user) {
      return;
    }

    const roomName = `user:${user._id}`;
    socket.join(roomName);
    socket.userId = user._id.toString();
    socket.emit('socket_registered', { success: true, userId: socket.userId });

    console.log(`Socket connected: ${socket.id} joined room ${roomName}`);
  } catch (error) {
    console.warn('Socket authentication failed:', error.message);
  }
};

const attachSocketServer = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', async (socket) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    await joinUserRoom(socket, token);

    socket.on('register', async ({ userId, token: authToken }) => {
      if (authToken) {
        await joinUserRoom(socket, authToken);
      } else if (userId) {
        const roomName = `user:${userId}`;
        socket.join(roomName);
        socket.userId = userId;
        socket.emit('socket_registered', { success: true, userId });
      }
    });

    socket.on('disconnect', () => {
      if (socket.userId) {
        console.log(`Socket disconnected: ${socket.id} user ${socket.userId}`);
      }
    });
  });

  io.on('error', (error) => {
    console.error('Socket.IO error:', error);
  });
};

const emitToUser = (userId, event, payload) => {
  if (!io || !userId) {
    return;
  }

  const roomName = `user:${userId}`;
  io.to(roomName).emit(event, payload);
};

module.exports = {
  attachSocketServer,
  emitToUser
};
