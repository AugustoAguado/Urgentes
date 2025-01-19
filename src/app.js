
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Tus rutas
const authRoutes = require('./routes/authRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const adminRoutes = require('./routes/adminRoutes'); // <-- Importar
const catalogRoutes = require('./routes/catalogRoutes');
const app = express();


app.use(cors());
app.use(express.json());

// Rutas
app.use('/auth', authRoutes);
app.use('/tickets', ticketRoutes);

// Nueva ruta de admin
app.use('/admin', adminRoutes);

// Archivos estáticos
app.use(express.static('public'));
app.use('/catalog', catalogRoutes);

module.exports = app;
