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

// 🔒 HEADERS para romper caché
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// 🚨 Recarga forzada automática temporal
const vencimiento = new Date('2025-05-22T12:00:00'); // Ajustá la fecha si querés

app.get('/', (req, res, next) => {
  const ahora = new Date();
  if (ahora < vencimiento) {
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Actualizando versión...</title>
          <script>
            console.log("Forzando recarga del frontend...");
            window.location.reload(true);
          </script>
        </head>
        <body>
          <p>Actualizando versión, por favor espere...</p>
        </body>
      </html>
    `);
  }
  next();
});

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
