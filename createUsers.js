require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./src/models/User');

async function createUsers() {
  try {
    // 1. Conexión a MongoDB usando la URI del archivo .env
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // 2. Hashear contraseñas
    const hashedPassVendedor = await bcrypt.hash('vendedor1075', 10);
    const hashedPassAdmin    = await bcrypt.hash('admin1075', 10);
    const hashedPassCompras1 = await bcrypt.hash('compras1075', 10);
    const hashedPassCompras2 = await bcrypt.hash('compras1075', 10);
    const hashedPassCompras3 = await bcrypt.hash('compras1075', 10);

    // 3. Definir arrays de rubros para cada usuario de compras
    //    (Aquí solo pongo algunos como ejemplo; completa con tu lista completa.)
    const COMPRAS1_RUBROS = [
        "AMORTIGUADORES LIVIANOS",
        "AMORTIGUADORES VASTAGO CORTO",
        "BUJES CAZOLETAS Y ELEMENTOS DE GOMAMETAL",
        "CREMALLERA CAJA DE DIRECCION MECANICA",
        "DESPIECE SYD SUSPENSION Y DIRECCION",
        "PARRILLA DE SUSPENSION",
        "RESORTES DE SUSPENSION",
        "RESORTES DEPORTIVOS",
        "SUSPENSION Y DIRECCION",
        "AMORTIGUADORES PESADOS-CAMIONES",
        "CREMALLERA HIDRAULICA"
      ];
      
      const COMPRAS2_RUBROS = [
        "A DETERMINAR",
        "ACCESORIOS",
        "ADITIVOS",
        "AHE ACTUADORES HIDRAULICOS DE EMBRAGUES",
        "AMORTIGUADORES OFFROAD",
        "BARRA ESTABILIZADORA",
        "BARRAS DE TORSION",
        "BARRAS TENSORAS",
        "BARRAS Y EXTREMOS LARGOS DE DIRECCION",
        "BASTIDOR",
        "BOMBA DE CEBADO COMBUSTIBLE",
        "BOMBA DE DIRECCION HIDRAULICA",
        "BOMBA DEPRESORA O DE VACIO",
        "BOMBA EMBRAGUE (PEDAL)",
        "BOMBA FRENO",
        "BOMBIN EMBRAGUE (CAJA)",
        "CABLE ACELERADOR",
        "CABLE EMBRAGUE",
        "CABLE FRENO",
        "CABLE SELECTORA",
        "CADENA PARA NIEVE",
        "CAJAS Y CAJONES",
        "CILINDRO DE RUEDA",
        "CONDENSADORES",
        "CORONAS DE ARRANQUE",
        "CORREA DISTRIBUCION DENTADAS",
        "CRAPODINAS MECANICAS EMBRAGUE",
        "CREMALLERA REPARADA HIDRAULICA",
        "CREMALLERA REPARADA MECANICA",
        "CRUCETAS",
        "CUBRECARTER",
        "CUERPOS",
        "DESPIECE EMBRAGUES",
        "DESPIECE FRENO",
        "DESPIECE SELECTORA Y VARILLAJE DE CAMBIO",
        "DESPIECE TERMICA",
        "DESPIECE TRANSMISION",
        "DISCOS Y CAMPANAS",
        "EJE TRASEROS",
        "ELASTICO",
        "EMBRAGUE REPARADO",
        "EMBRAGUES",
        "FLEXIBLE DE FRENO Y EMBRAGUE",
        "FUELLE Y TOPES SUSPENSION DELANTEROS Y TRASEROS",
        "FUELLE DIRECCION CREMALLERA",
        "FUELLE TRANSMISION LADO RUEDA Y CAJA",
        "GENERAL",
        "GUANTES",
        "GUIA DE DIRECTA",
        "HERRAMIENTAS",
        "HIDROLAVADORA-GENERADOR-COMPRESOR",
        "HOMOCINÉTICAS Y DESLIZANTES CAJA Y CARDAN",
        "HORQUILLAS",
        "INSUMOS",
        "KIT DE PERNOS Y PUNTA DE EJE",
        "LAVA AUTOS",
        "MANCHON",
        "MANGUERAS",
        "MANGUETAS",
        "MAZA Y PUNTA DE EJE CON Y SIN RULEMAN",
        "MOVIMIENTOS CARDANICOS DE DIRECCION",
        "PASTILLA DE FRENO",
        "POLEA BOMBA DE DIRECCION HIDRAULICA",
        "POLEA VISCOSA",
        "PORTAMAZAS",
        "REPARACION DE BOMBAS HIDRAULICAS",
        "RESORTE NEUMATICO CAPOT PORTON",
        "RETEN",
        "RULEMAN",
        "SELLAJUNTAS Y PEGAMENTOS",
        "SEMIEJE",
        "SOPORTE DE CABINA",
        "SOPORTE PUENTE CARDAN",
        "SOPORTES DE MOTOR-CAJA-EJE TRAS-CABINA",
        "SUPLEMENTOS Y SEPARADORES DE RUEDA",
        "TERMICA",
        "TRICETA",
        "VALVULA COMPENSADORA DE FRENO",
        "ZAPATA"
      ];
      
      const COMPRAS3_RUBROS = [
        "CORREA V O TRAPEZOIDALES",
        "DESPIECE FILTROS",
        "LIMPIAMANOS",
        "RADIADOR DE AGUA",
        "RADIADOR DE CALEFACCION",
        "AFLOJATUERCAS Y DESENGRANSTE",
        "BATERIAS",
        "BOBINA DE ENCENDIDO",
        "BOMBA DE AGUA",
        "BUJIAS DIESEL",
        "BUJIAS NAFTA",
        "CABLE DE BUJIAS ENCENDIDO",
        "CORREA POLIV CANALES",
        "ESCOBILLA",
        "FILTRO ACEITE",
        "FILTRO AIRE",
        "FILTRO CABINA O HABITACULO",
        "FILTRO COMBUSTIBLE",
        "FILTRO DE TRANSMISION",
        "GRASAS",
        "KIT DE FILTROS",
        "KIT DE POLIV CORREAS Y TENSORES",
        "KIT DISTRIBUCION C/CADENA",
        "KIT DISTRIBUCION C/CORREA",
        "LAMPARA 12V",
        "LAMPARA 24V",
        "LIQUIDOS DE FRENO",
        "LUBRICANTES DE JARDINERIA",
        "LUBRICANTES DE MOTOR",
        "LUBRICANTES DE TRANSMISION Y DIRECCION",
        "REFRIGERANTES",
        "TENSOR POLIV Y DISTRIBUCION TODOS"
      ];

      

      const TODOS_LOS_RUBROS = [...COMPRAS1_RUBROS, ...COMPRAS2_RUBROS, ...COMPRAS3_RUBROS];

    // 4. Crear usuarios
    await User.create([
      // Vendedor
      {
        username: 'vendedor1',
        password: hashedPassVendedor,
        role: 'vendedor',
        rubros: [] // El vendedor no maneja rubros
      },
      // Admin
      {
        username: 'admin1',
        password: hashedPassAdmin,
        role: 'admin',
        rubros: []
      },
      // Compras 1
      {
        username: 'compras1',
        password: hashedPassCompras1,
        role: 'compras',
        rubros: COMPRAS1_RUBROS
      },
      // Compras 2
      {
        username: 'compras2',
        password: hashedPassCompras2,
        role: 'compras',
        rubros: COMPRAS2_RUBROS
      },
      // Compras 3
      {
        username: 'compras3',
        password: hashedPassCompras3,
        role: 'compras',
        rubros: COMPRAS3_RUBROS
      },
      {
        username: 'comprasadmin',
        password: await bcrypt.hash('compras1075', 10),
        role: 'compras',
        rubros: TODOS_LOS_RUBROS
      },
  
    ]);

    console.log('Usuarios creados con éxito.');
    process.exit(0);

  } catch (error) {
    console.error('Error al crear usuarios:', error);
    process.exit(1);
  }
}

createUsers();
