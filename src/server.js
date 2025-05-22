const express = require('express');
const app = require('./app');
const connectDB = require('./config/db');
const cron = require('node-cron');
const { cleanupOldComments } = require('./controllers/ticketController');
const packageJson = require('../package.json');
const path = require('path');

const http = require('http');
const { Server } = require('socket.io');
const { setIO } = require('./helpers/socket');
const versionRouter = require('./routes/version');

const PORT = process.env.PORT || 3000;


// 🔁 Endpoint de versión
app.get('/version', (req, res) => {
  res.json({ version: packageJson.version });
});

app.use('/api', versionRouter);

// 🗂️ Archivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// 🔌 Servidor HTTP
const server = http.createServer(app);

// 🔴 WebSocket
const io = new Server(server);
setIO(io);

// 🚀 DB y arranque
connectDB(process.env.MONGODB_URI).then(() => {
  server.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
  });
});
