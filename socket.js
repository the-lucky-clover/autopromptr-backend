const { Server } = require('socket.io');
const config = require('./config');

function setupWebSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: config.wsCorsOrigin,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });

    // Example custom event
    socket.on('chat-message', (msg) => {
      io.emit('chat-message', msg);
    });
  });

  return io;
}

module.exports = setupWebSocket;