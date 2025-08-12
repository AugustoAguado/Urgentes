// config/db.js
const mongoose = require('mongoose');

const connectDB = async (uri) => {
  if (!uri) {
    console.error('Falta MONGODB_URI en las env vars');
    process.exit(1);
  }

  // Opciones que evitan el “ReplicaSetNoPrimary / secureConnect timed out”
  const opts = {
    family: 4,                     // fuerza IPv4 (evita líos con IPv6)
    serverSelectionTimeoutMS: 90000,
    socketTimeoutMS: 60000,
    maxPoolSize: 10,
  };

  let intentos = 0;
  const maxIntentos = 5;

  while (intentos < maxIntentos) {
    try {
      await mongoose.connect(uri, opts);
      console.log('Conectado a MongoDB Atlas');
      // Logs útiles
      mongoose.connection.on('error', (e) => console.error('Mongo error:', e?.message || e));
      mongoose.connection.on('disconnected', () => console.warn('Mongo desconectado'));
      return mongoose.connection;
    } catch (e) {
      intentos += 1;
      console.error(`Error conectando a MongoDB (intento ${intentos}/${maxIntentos}):`, e?.message || e);
      // pequeño backoff
      await new Promise(r => setTimeout(r, 2000 * intentos));
    }
  }

  console.error('No se pudo conectar a MongoDB después de varios intentos.');
  process.exit(1);
};

module.exports = connectDB;
