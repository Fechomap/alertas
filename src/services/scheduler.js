// src/services/scheduler.js
const cron = require('node-cron');
const { generateWeeklyExcel } = require('./report');
const { sendExcelAsDocument } = require('../utils/file-helper'); // Fix para Railway

let bot = null;

function initializeScheduler(botInstance) {
  bot = botInstance;
  console.log('📅 Inicializando sistema de jobs automáticos...');

  // Job automático: Reporte semanal todos los domingos a las 23:55
  cron.schedule('55 23 * * 0', async () => {
    console.log('🔄 Ejecutando job automático: Reporte semanal dominical');
    await sendWeeklyReportToAdmin();
  }, {
    timezone: 'America/Mexico_City'
  });

  console.log('✅ Job programado: Reporte semanal domingos 23:55 (hora México)');
}

async function sendWeeklyReportToAdmin() {
  const adminChatId = process.env.ADMIN_CHAT_ID;

  if (!adminChatId) {
    console.error('❌ ADMIN_CHAT_ID no configurado en variables de entorno');
    return;
  }

  if (!bot) {
    console.error('❌ Bot no inicializado para scheduler');
    return;
  }

  try {
    console.log(`📊 Generando reporte semanal automático para admin: ${adminChatId}`);

    // Generar Excel semanal
    const excelBuffer = await generateWeeklyExcel();

    // Obtener fechas de la semana para el mensaje
    const today = new Date();
    const monday = new Date(today);
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    monday.setDate(today.getDate() + daysToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const fechaInicio = monday.toLocaleDateString('es-MX');
    const fechaFin = sunday.toLocaleDateString('es-MX');

    // Mensaje personalizado para el admin
    const caption = '🤖 *Reporte Semanal Automático*\n\n' +
                   `📅 *Período:* ${fechaInicio} - ${fechaFin}\n` +
                   `🕐 *Generado:* ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}\n` +
                   '📍 *Enviado automáticamente cada domingo 23:55*\n\n' +
                   '📊 *Resumen semanal de maniobras registradas*';

    // Enviar el archivo Excel al admin - Fix definitivo para Railway
    await sendExcelAsDocument(bot, adminChatId, excelBuffer, {
      caption: caption,
      parse_mode: 'Markdown'
    }, {
      filename: `reporte_semanal_automatico_${new Date().toISOString().split('T')[0]}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    console.log(`✅ Reporte semanal automático enviado exitosamente a admin: ${adminChatId}`);

  } catch (error) {
    console.error('❌ Error enviando reporte semanal automático:', error);

    // Intentar enviar mensaje de error al admin
    try {
      await bot.sendMessage(adminChatId,
        '❌ *Error generando reporte semanal automático*\n\n' +
        'El sistema intentó generar el reporte pero falló. ' +
        'Revisa los logs del servidor para más detalles.\n\n' +
        `🕐 *Hora del error:* ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`,
        { parse_mode: 'Markdown' }
      );
    } catch (notificationError) {
      console.error('❌ Error enviando notificación de error:', notificationError);
    }
  }
}

// Función para testing manual del job
async function testWeeklyReport() {
  console.log('🧪 Ejecutando test manual del reporte semanal...');
  await sendWeeklyReportToAdmin();
}

module.exports = {
  initializeScheduler,
  testWeeklyReport
};