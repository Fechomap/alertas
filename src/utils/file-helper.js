// src/utils/file-helper.js
const fs = require('fs').promises;
const path = require('path');

async function sendExcelAsDocument(bot, chatId, excelBuffer, options = {}, fileOptions = {}) {
  const tempDir = process.env.NODE_ENV === 'production' ? '/tmp' : './temp';
  const filename = fileOptions.filename || `reporte_${Date.now()}.xlsx`;
  const tempFilePath = path.join(tempDir, filename);

  try {
    // Crear directorio temporal si no existe
    try {
      await fs.mkdir(tempDir, { recursive: true });
    } catch (_err) {
      // Directorio ya existe
    }

    // Escribir buffer al archivo temporal
    await fs.writeFile(tempFilePath, excelBuffer);

    // Enviar archivo desde el disco
    const result = await bot.sendDocument(chatId, tempFilePath, {
      ...options,
      contentType: fileOptions.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    // Limpiar archivo temporal
    try {
      await fs.unlink(tempFilePath);
    } catch (_cleanupError) {
      console.warn('⚠️ No se pudo eliminar archivo temporal');
    }

    return result;
  } catch (error) {
    // Limpiar archivo temporal en caso de error
    try {
      await fs.unlink(tempFilePath);
    } catch (cleanupError) {
      // Ignorar errores de limpieza
    }
    throw error;
  }
}

module.exports = {
  sendExcelAsDocument
};