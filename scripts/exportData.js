// scripts/exportData.js
const ExcelJS = require('exceljs');
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
    
    // Crear un nuevo libro de trabajo Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Bot Soporte';
    workbook.lastModifiedBy = 'Sistema de Exportación';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Preparar hoja de maniobras
    const maniobraSheet = workbook.addWorksheet('Maniobras');
    maniobraSheet.columns = [
      { header: 'ID del Grupo', key: 'chatId', width: 15 },
      { header: 'Nombre del Grupo', key: 'groupName', width: 25 },
      { header: 'ID del Alert Manager', key: 'alertManagerId', width: 20 },
      { header: 'Cantidad de Maniobras', key: 'maniobras', width: 20 },
      { header: 'Descripción', key: 'descripcion', width: 30 },
      { header: 'Fecha', key: 'fecha', width: 20 }
    ];
    
    // Aplicar estilo a la fila de encabezado
    maniobraSheet.getRow(1).font = { bold: true };
    
    // Formatear la columna de fecha
    maniobraSheet.getColumn('fecha').numFmt = 'dd/mm/yyyy hh:mm:ss';
    
    // Agregar los datos de maniobras
    maniobras.forEach(m => {
      maniobraSheet.addRow({
        chatId: m.chatId,
        groupName: groupMap[m.chatId] || m.groupName,
        alertManagerId: m.alertManagerId,
        maniobras: m.maniobras,
        descripcion: m.descripcion,
        fecha: m.fecha // ExcelJS maneja bien las fechas de JavaScript
      });
    });
    
    // Preparar hoja de grupos
    const groupSheet = workbook.addWorksheet('Grupos');
    groupSheet.columns = [
      { header: 'ID del Grupo', key: 'chatId', width: 15 },
      { header: 'Nombre para Mostrar', key: 'displayName', width: 30 }
    ];
    
    // Aplicar estilo a la fila de encabezado
    groupSheet.getRow(1).font = { bold: true };
    
    // Agregar datos de grupos
    uniqueGroups.forEach(chatId => {
      groupSheet.addRow({
        chatId: chatId,
        displayName: groupMap[chatId] || ''
      });
    });
    
    // Guardar archivo en la carpeta scripts
    const filename = path.join(__dirname, 'data.xlsx');
    await workbook.xlsx.writeFile(filename);
    
    console.log(`Datos exportados exitosamente a ${filename}`);
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error al exportar datos:', error);
    process.exit(1);
  }
}

exportToExcel();