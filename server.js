const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { DatabaseManager } = require('./database/manager');
const authRoutes = require('./routes/auth');
const whatsappRoutes = require('./routes/whatsapp');
const chatRoutes = require('./routes/chat');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Initialize database
const db = new DatabaseManager();

// Middleware
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/chat', chatRoutes);

// Socket.IO for real-time chat
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join_chat', (data) => {
    socket.join('chat_room');
    console.log('User joined chat room');
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io available to routes
app.set('io', io);

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// WhatsApp webhook endpoint
app.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'default_verify_token';
  
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook verified');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

app.post('/webhook', (req, res) => {
  const body = req.body;
  
  if (body.object === 'whatsapp_business_account') {
    body.entry.forEach((entry) => {
      const webhookEvent = entry.changes[0];
      console.log('Webhook event:', JSON.stringify(webhookEvent, null, 2));
      
      if (webhookEvent.field === 'messages') {
        const messages = webhookEvent.value.messages;
        if (messages) {
          messages.forEach((message) => {
            // Store message in database
            const messageData = {
              id: message.id,
              from: message.from,
              timestamp: message.timestamp,
              text: message.text?.body || '',
              type: message.type,
              received_at: new Date().toISOString()
            };
            
            db.addMessage(messageData);
            
            // Emit to all connected clients
            io.to('chat_room').emit('new_message', messageData);
          });
        }
      }
    });
    
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the application at http://localhost:${PORT}`);
});

module.exports = { app, io };