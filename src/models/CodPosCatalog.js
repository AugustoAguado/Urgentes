// models/CodPosCatalog.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const CodPosCatalogSchema = new Schema({
  codPos: { type: String, required: true },
  rubro:  { type: String, required: true }
});

module.exports = mongoose.model('CodPosCatalog', CodPosCatalogSchema);
