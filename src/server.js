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
const versionRouter = require('./routes/version'); // 🚨 nuevo

const PORT = process.env.PORT || 3000;

let primeraRecargaForzada = true;

app.get('/', (req, res, next) => {
  if (primeraRecargaForzada) {
    primeraRecargaForzada = false; // solo una vez
    return res.send(`
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Actualizando...</title>
          <script>
            console.log("Forzando recarga...");
            window.location.reload(true);
          </script>
        </head>
        <body>
          <p>Actualizando versión...</p>
        </body>
      </html>
    `);
  }
  next(); // después de la primera vez, sigue como normal
});

// Rutas
app.get('/version', (req, res) => {
  res.json({ version: packageJson.version });
});

app.use('/api', versionRouter); // Para avisar la versión de la API

// Archivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Servidor HTTP
const server = http.createServer(app);

// WebSocket
const io = new Server(server);
setIO(io);

// DB y arranque
connectDB(process.env.MONGODB_URI).then(() => {
  server.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
  });
});
