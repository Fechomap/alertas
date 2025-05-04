// src/services/report.js
const XLSX = require('xlsx');
const { Maniobra, Group } = require('../models');

async function generateExcel() {
  // NO necesitas conectar a MongoDB porque ya está conectado en tu app
  
  // Usa directamente los modelos importados (NO los crees de nuevo)
  const maniobras = await Maniobra.find().lean();
  const groups = await Group.find().lean();
  
  console.log(`Encontrados ${maniobras.length} registros de maniobras`);
  
  // Crear mapeo de grupos existentes
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
      'Nombre del Grupo': m.groupName,
      'ID del Alert Manager': m.alertManagerId,
      'Cantidad de Maniobras': m.maniobras,
      'Descripción': m.descripcion,
      'Fecha': fecha,
      'Fecha Texto': fechaTexto
    };
  });

  // Crear libro de Excel
  const wb = XLSX.utils.book_new();
  
  // Agregar hoja de maniobras
  const wsManiobras = XLSX.utils.json_to_sheet(maniobraData);
  XLSX.utils.book_append_sheet(wb, wsManiobras, 'Maniobras');
  
  // Crear datos para hoja de grupos
  const uniqueGroups = new Set();
  const groupsData = [];
  
  maniobras.forEach(m => {
    if (!uniqueGroups.has(m.chatId)) {
      uniqueGroups.add(m.chatId);
      groupsData.push({
        'ID del Grupo': m.chatId,
        'Nombre para Mostrar': m.groupName
      });
    }
  });
  
  // Agregar hoja de grupos
  const wsGroups = XLSX.utils.json_to_sheet(groupsData);
  XLSX.utils.book_append_sheet(wb, wsGroups, 'Grupos');

  // Generar buffer del Excel en memoria (no guardarlo en disco)
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  
  return buffer;
}

module.exports = {
  generateExcel
};