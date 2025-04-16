// scripts/exportData.js
require('dotenv').config();
const XLSX = require('xlsx');
const mongoose = require('mongoose');
const path = require('path');
const config = require('./config');

async function exportToExcel() {
  try {
    await mongoose.connect(config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Conectado a MongoDB');
    
    // Obtener maniobras y grupos
    const Maniobra = mongoose.model('Maniobra', config.maniobraSchema);
    const Group = mongoose.model('Group', config.groupSchema);
    
    const maniobras = await Maniobra.find().lean();
    const groups = await Group.find().lean();
    
    console.log(`Encontrados ${maniobras.length} registros de maniobras`);
    
    // Crear mapeo de grupos existentes (pero lo usaremos solo como referencia)
    const groupMap = groups.reduce((acc, group) => {
      acc[group.chatId] = group.displayName;
      return acc;
    }, {});
    
    // Preparar datos para Excel
    const maniobraData = maniobras.map(m => {
      // Crear objeto de fecha JavaScript
      const fecha = new Date(m.fecha);
      
      // Formatear la fecha para el texto de México (CDMX)
      const fechaTexto = fecha.toLocaleString('es-MX', {
        timeZone: 'America/Mexico_City',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      
      return {
        'ID del Grupo': m.chatId,
        'Nombre del Grupo': m.groupName, // Usar el nombre guardado en la maniobra
        'ID del Alert Manager': m.alertManagerId,
        'Cantidad de Maniobras': m.maniobras,
        'Descripción': m.descripcion,
        'Fecha': fecha, // Fecha original para que XLSX la procese
        'Fecha Texto': fechaTexto // Fecha formateada en zona horaria de México
      };
    });

    // Crear libro de Excel
    const wb = XLSX.utils.book_new();
    
    // Agregar hoja de maniobras
    const wsManiobras = XLSX.utils.json_to_sheet(maniobraData);
    XLSX.utils.book_append_sheet(wb, wsManiobras, 'Maniobras');
    
    // Crear datos para hoja de grupos (usando grupos únicos de maniobras)
    const uniqueGroups = new Set();
    const groupsData = [];
    
    maniobras.forEach(m => {
      if (!uniqueGroups.has(m.chatId)) {
        uniqueGroups.add(m.chatId);
        groupsData.push({
          'ID del Grupo': m.chatId,
          'Nombre para Mostrar': m.groupName // Usar el nombre guardado en la maniobra
        });
      }
    });
    
    // Agregar hoja de grupos
    const wsGroups = XLSX.utils.json_to_sheet(groupsData);
    XLSX.utils.book_append_sheet(wb, wsGroups, 'Grupos');

    // Guardar archivo
    const filename = path.join(__dirname, 'data.xlsx');
    XLSX.writeFile(wb, filename);

    console.log(`✅ Datos exportados exitosamente a ${filename}`);
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error al exportar datos:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

exportToExcel();