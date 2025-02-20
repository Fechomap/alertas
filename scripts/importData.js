// importData.js
const XLSX = require('xlsx');
const mongoose = require('mongoose');
const path = require('path');
const config = require('./config');

async function importFromExcel() {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('Conectado a MongoDB');

    const Maniobra = mongoose.model('Maniobra', config.maniobraSchema);
    const Group = mongoose.model('Group', config.groupSchema);
    
    // Leer archivo Excel desde la carpeta scripts
    const filename = path.join(__dirname, 'data.xlsx');
    console.log('Intentando leer:', filename);
    
    const workbook = XLSX.readFile(filename);
    
    // Procesar hoja de grupos
    const groupsSheet = workbook.Sheets['Grupos'];
    const groupsData = XLSX.utils.sheet_to_json(groupsSheet);
    
    // Actualizar grupos en la base de datos
    for (const row of groupsData) {
      if (row['ID del Grupo'] && row['Nombre para Mostrar']) {
        await Group.findOneAndUpdate(
          { chatId: row['ID del Grupo'].toString() },
          { 
            chatId: row['ID del Grupo'].toString(),
            displayName: row['Nombre para Mostrar']
          },
          { upsert: true }
        );
      }
    }
    
    // Crear mapeo de nombres de grupos
    const groupNameMap = groupsData.reduce((acc, row) => {
      if (row['ID del Grupo'] && row['Nombre para Mostrar']) {
        acc[row['ID del Grupo']] = row['Nombre para Mostrar'];
      }
      return acc;
    }, {});

    // Procesar hoja de maniobras
    const maniobraSheet = workbook.Sheets['Maniobras'];
    const maniobraData = XLSX.utils.sheet_to_json(maniobraSheet);

    // Validar y preparar datos
    const processedData = maniobraData.map(row => ({
      chatId: row['ID del Grupo'].toString(),
      groupName: groupNameMap[row['ID del Grupo']] || row['Nombre del Grupo'],
      alertManagerId: Number(row['ID del Alert Manager']),
      maniobras: Number(row['Cantidad de Maniobras']),
      descripcion: row['Descripción'],
      fecha: new Date(row['Fecha'])
    }));

    // Validar datos
    const invalidData = processedData.filter(data => 
      !data.chatId || 
      !data.groupName || 
      isNaN(data.alertManagerId) || 
      isNaN(data.maniobras) || 
      data.maniobras < 1 || 
      data.maniobras > 10 || 
      !data.descripcion || 
      isNaN(data.fecha.getTime())
    );

    if (invalidData.length > 0) {
      console.error('Se encontraron registros inválidos:', invalidData);
      throw new Error('Datos inválidos en el archivo Excel');
    }

    // Insertar datos
    await Maniobra.insertMany(processedData);
    console.log(`${processedData.length} registros importados exitosamente`);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error al importar datos:', error);
    process.exit(1);
  }
}

// Ejecutar la importación
importFromExcel();