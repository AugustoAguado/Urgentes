// User.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['vendedor', 'compras', 'admin'], required: true },
  // Array de rubros, cada rubro es un String
  rubros: [{ type: String }]
});

module.exports = mongoose.model('User', UserSchema);
