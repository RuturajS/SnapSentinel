const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs-extra');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Storage
const UPLOADS_DIR = path.join(__dirname, 'uploads');
fs.ensureDirSync(UPLOADS_DIR);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const clientDir = path.join(UPLOADS_DIR, req.body.clientId || 'unknown');
    fs.ensureDirSync(clientDir);
    cb(null, clientDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    cb(null, `${timestamp}-${file.originalname}`);
  }
});
const upload = multer({ storage: storage });

// In-memory db (for prototype)
let clients = {}; // clientId -> { status, lastSeen, config, metadata }

// Socket.io
io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  socket.on('register', (data) => {
    // data: { clientId, os, version }
    const { clientId } = data;
    console.log(`Registering client: ${clientId}`);
    clients[clientId] = {
      ...clients[clientId],
      ...data,
      socketId: socket.id,
      status: 'online',
      lastSeen: new Date()
    };
    socket.join(clientId);
    io.emit('clients_update', clients); // Notify admin of full list or update
  });

  socket.on('disconnect', () => {
    const clientId = Object.keys(clients).find(id => clients[id].socketId === socket.id);
    if (clientId) {
      clients[clientId].status = 'offline';
      // lastSeen is already set in the object, but update it?
      clients[clientId].lastSeen = new Date();
      io.emit('clients_update', clients);
      console.log(`Client disconnected: ${clientId}`);

      if (process.env.DISCORD_WEBHOOK_URL) {
        fetch(process.env.DISCORD_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `⚠️ **Client Offline**: ${clientId}`
          })
        }).catch(err => console.error('Webhook Error:', err.message));
      }
    }
  });

  // Admin commands
  socket.on('admin_command', (data) => {
    const { targetClientId, command, payload } = data;
    console.log(`Admin command to ${targetClientId}: ${command}`);
    if (targetClientId && clients[targetClientId]) {
      io.to(clients[targetClientId].socketId).emit('command', { command, payload });
    }
  });
});

// REST API
app.post('/upload', upload.single('image'), (req, res) => {
  const { clientId } = req.body;
  if (!clientId || !req.file) return res.status(400).send('Missing data');

  console.log(`Received image from ${clientId}`);

  // Notify admin
  const imageUrl = `http://localhost:3000/uploads/${clientId}/${req.file.filename}`;
  io.emit('new_image', {
    clientId,
    imageUrl,
    filename: req.file.filename,
    timestamp: new Date()
  });

  // Webhook trigger
  if (process.env.DISCORD_WEBHOOK_URL) {
    fetch(process.env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `📸 **New Snap Received**\n**Client:** ${clientId}\n**Time:** ${new Date().toLocaleString()}\n[View Image](${imageUrl})`
      })
    }).catch(err => console.error('Webhook Error:', err.message));
  }

  res.send('ok');
});

app.get('/clients', (req, res) => {
  res.json(clients);
});

// Serve images
app.use('/uploads', express.static(UPLOADS_DIR));

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
