require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const csvParser = require('csv-parser');
const CodPosCatalog = require('./src/models/CodPosCatalog'); // ajusta la ruta según tu estructura

// Ruta del archivo CSV (ajusta si tu archivo se llama distinto)
const CSV_FILE_PATH = './codPos.csv';

async function importCodPos() {
  try {
    // 1) Conexión a MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // 2) Leemos el CSV y parseamos las filas
    const rows = [];
    fs.createReadStream(CSV_FILE_PATH)
    .pipe(csvParser({
        headers: ['codPos', 'rubro'], // asigna nombres
        skipLines: 0 // si quieres saltar la primera línea, ajusta aquí
      }))// csv-parser procesará cada línea como un objeto
      .on('data', (data) => {
        // data representará una fila del CSV
        // asumiendo que tus columnas se llaman "codPos" y "rubro"
        rows.push({
          codPos: data.codPos,
          rubro:  data.rubro
        });
      })
      .on('end', async () => {
        console.log(`Leídas ${rows.length} filas. Insertando en MongoDB...`);
        
        // 3) Insertar en la colección 'CodPosCatalog'
        try {
          // Opcional: Podrías hacer un 'drop' de la colección para limpiarla antes:
          // await CodPosCatalog.deleteMany({});
          
          await CodPosCatalog.insertMany(rows);
          console.log('¡Importación completada!');

        } catch (err) {
          console.error('Error insertando en la base de datos:', err);
        } finally {
          // 4) Cerrar la conexión
          mongoose.disconnect();
        }
      })
      .on('error', (err) => {
        console.error('Error leyendo el CSV:', err);
        mongoose.disconnect();
      });

  } catch (error) {
    console.error('Error conectando a MongoDB:', error);
    process.exit(1);
  }
}

importCodPos();
