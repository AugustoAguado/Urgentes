// src/routes/version.js
const express = require('express');
const router = express.Router();
const { getIO } = require('../helpers/socket');

router.post('/avisar-nueva-version', (req, res) => {
  const io = getIO();
  io.emit('nuevaVersion');
  console.log('🔁 Aviso de nueva versión enviado por WebSocket');
  res.status(200).json({ mensaje: 'Aviso de nueva versión enviado correctamente.' });
});

module.exports = router;
