// exportData.js
const XLSX = require('xlsx');
const mongoose = require('mongoose');
const path = require('path');
const config = require('./config');

async function exportToExcel() {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('Conectado a MongoDB');

    const Maniobra = mongoose.model('Maniobra', config.maniobraSchema);
    const Group = mongoose.model('Group', config.groupSchema);
    
    // Obtener maniobras y grupos
    const maniobras = await Maniobra.find().lean();
    const groups = await Group.find().lean();
    
    // Crear mapeo de grupos existentes
    const groupMap = groups.reduce((acc, group) => {
      acc[group.chatId] = group.displayName;
      return acc;
    }, {});
    
    // Obtener grupos únicos de maniobras
    const uniqueGroups = [...new Set(maniobras.map(m => m.chatId))];
    
    // Crear hoja de grupos
    const groupsData = uniqueGroups.map(chatId => ({
      'ID del Grupo': chatId,
      'Nombre para Mostrar': groupMap[chatId] || ''
    }));

    // Preparar datos para Excel
    const maniobraData = maniobras.map(m => ({
      'ID del Grupo': m.chatId,
      'Nombre del Grupo': groupMap[m.chatId] || m.groupName,
      'ID del Alert Manager': m.alertManagerId,
      'Cantidad de Maniobras': m.maniobras,
      'Descripción': m.descripcion,
      'Fecha': m.fecha.toISOString(),
      'Fecha (formato legible)': m.fecha.toLocaleString()
    }));

    // Crear libro de Excel
    const wb = XLSX.utils.book_new();
    
    // Agregar hojas
    const wsManiobras = XLSX.utils.json_to_sheet(maniobraData);
    const wsGroups = XLSX.utils.json_to_sheet(groupsData);
    XLSX.utils.book_append_sheet(wb, wsManiobras, 'Maniobras');
    XLSX.utils.book_append_sheet(wb, wsGroups, 'Grupos');

    // Guardar archivo en la carpeta scripts
    const filename = path.join(__dirname, 'data.xlsx');
    XLSX.writeFile(wb, filename);

    console.log(`Datos exportados exitosamente a ${filename}`);
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error al exportar datos:', error);
    process.exit(1);
  }
}

exportToExcel();