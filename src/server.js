// server.js
const express = require('express');
const app = require('./app');
const connectDB = require('./config/db');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { setIO } = require('./helpers/socket');
const versionRouter = require('./routes/version');
const packageJson = require('../package.json');

const PORT = process.env.PORT || 3000;

// Endpoint de versión
app.get('/version', (req, res) => res.json({ version: packageJson.version }));

app.use('/api', versionRouter);
app.use(express.static(path.join(__dirname, '../public')));

const server = http.createServer(app);
const io = new Server(server);
setIO(io);

connectDB(process.env.MONGODB_URI).then(() => {
  server.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
});

// cierre prolijo
process.on('SIGINT', async () => {
  try {
    await require('mongoose').connection.close();
  } finally {
    process.exit(0);
  }
});
