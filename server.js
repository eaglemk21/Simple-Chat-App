const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Serve static files (React build)
app.use(express.static('public'));

const users = []; // Track connected users
const messages = []; // Track messages with IDs
let messageIdCounter = 0; // Simple ID generator

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Send existing messages to new user
  socket.emit('initialMessages', messages);

  socket.on('join', (username) => {
    socket.username = username;
    users.push({ id: socket.id, username });
    io.emit('message', {
      id: messageIdCounter++,
      user: 'System',
      text: `${username} joined the chat`,
      time: new Date().toLocaleTimeString(),
    });
    io.emit('userList', users.map((u) => u.username));
  });

  socket.on('leave', (username) => {
    users.splice(users.findIndex((u) => u.username === username), 1);
    io.emit('message', {
      id: messageIdCounter++,
      user: 'System',
      text: `${username} left the chat`,
      time: new Date().toLocaleTimeString(),
    });
    io.emit('userList', users.map((u) => u.username));
  });

  socket.on('chatMessage', (msg) => {
    const message = {
      id: messageIdCounter++,
      user: socket.username,
      text: msg,
      time: new Date().toLocaleTimeString(),
    };
    messages.push(message);
    io.emit('message', message);
  });

  socket.on('deleteMessage', (messageId) => {
    const index = messages.findIndex((msg) => msg.id === messageId && msg.user === socket.username);
    if (index !== -1) {
      messages.splice(index, 1);
      io.emit('deleteMessage', messageId);
    }
  });

  socket.on('disconnect', () => {
    if (socket.username) {
      users.splice(users.findIndex((u) => u.username === socket.username), 1);
      io.emit('message', {
        id: messageIdCounter++,
        user: 'System',
        text: `${socket.username} disconnected`,
        time: new Date().toLocaleTimeString(),
      });
      io.emit('userList', users.map((u) => u.username));
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});