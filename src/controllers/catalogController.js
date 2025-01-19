// controllers/catalogController.js
const CodPosCatalog = require('../models/CodPosCatalog');

exports.getCodPos = async (req, res) => {
    try {
      const cod = req.params.cod; // p.ej. /catalog/codpos/ABCD123
      const doc = await CodPosCatalog.findOne({ codPos: cod });
      if (!doc) {
        return res.status(404).json({ error: 'No existe este Cod/Pos' });
      }
      res.json(doc);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error buscando codPos' });
    }
  };
  