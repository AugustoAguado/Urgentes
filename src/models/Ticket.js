const mongoose = require('mongoose');

const generateShortId = () => {
  const timestamp = Date.now().toString(36); // Base 36 de la marca de tiempo
  const random = Math.random().toString(36).substring(2, 6).toUpperCase(); // 4 caracteres aleatorios
  return `${timestamp}-${random}`; // Combinar para generar un ID único corto
  
};
const { Schema } = mongoose;

const TicketSchema = new mongoose.Schema({
  fecha: { type: Date, default: Date.now },
  chasis: { type: String, },
  cod_pos: { type: String, required: true },
  cant: { type: Number, required: true },
  comentario: { type: String },
  cliente: { type: String, required: true },
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  estado: { type: String, default: 'pendiente', enum: ['pendiente', 'resuelto', 'negativo'] },
  rubro: { type: String },
  tipo: {
    type: String,
    enum: ['consulta', 'revision', 'urgente'], // Restringimos a estos valores
    required: true
  },
  usuariosAsignados: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // Array de IDs de usuarios
  ],
  resolucion: { type: String },
  codigo: { type: String },
  cantidad_resuelta: { type: Number },
  proveedor: { type: String },
  ingreso: { type: String },
  comentario_resolucion: { type: String },
  avisado: { type: Boolean, default: false },
  pago: { type: Boolean, default: false },
  llego: {
    type: String,
    enum: ['si', 'no'], // Acepta solo estos valores
    default: 'no',
  },
  shortId: { type: String, default: () => generateShortId(), unique: true }, // Campo único e inmutable
  comentarios: [
    {
      texto: { type: String, required: true },
      fecha: { type: Date, default: Date.now },
      usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    },
  ],
  nuevosComentarios: {
    vendedor: { type: Boolean, default: false },
    compras: { type: Boolean, default: false },
  },
});

module.exports = mongoose.model('Ticket', TicketSchema);
