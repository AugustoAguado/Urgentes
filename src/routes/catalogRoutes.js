// Ejemplo de catalogRoutes.js
const express = require('express');
const router = express.Router();
const CodPosCatalog = require('../models/CodPosCatalog');

// GET /catalog/codpos/:cod  (coincidencia exacta de codPos)
router.get('/codpos/:cod', async (req, res) => {
    try {
      const { cod } = req.params;
      
      // Buscamos coincidencia EXACTA, pero insensible a mayúsculas:
      // ^ y $ para que sea "exacto" (no contenga otros caracteres antes o después).
      const regex = new RegExp(`^${cod.trim()}$`, 'i');
  
      const doc = await CodPosCatalog.findOne({ 
        codPos: { $regex: regex }
      });
  
      if (!doc) {
        return res.status(404).json({ message: 'Cod/Pos no encontrado' });
      }
      res.json(doc);
    } catch (error) {
      console.error('Error al buscar codPos:', error);
      res.status(500).json({ error: 'Error interno al buscar codPos' });
    }
  });

module.exports = router;
