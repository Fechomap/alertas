// src/handlers/commands.js
const { sendMainMenu } = require('./messages');
const { isAlertManager } = require('../utils/permissions');
const { cancelAllAlertsForChat, activeAlerts } = require('../services/alert');
const { clearUserStates } = require('../services/maniobra');
const { sendWeeklyExcelReport } = require('../services/report'); // Importar función de reporte

function setupCommandHandlers(bot) {
  console.log('🔄 Configurando handlers de comandos...');

  // Comando /start
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    console.log('🚀 Comando /start recibido');
    clearUserStates(chatId);

    // Mostrar menú principal con teclado persistente
    const keyboards = require('../ui/keyboards');
    bot.sendMessage(chatId, '🟢 Bot activado. Usa los botones de abajo para comenzar.', {
      reply_markup: keyboards.getPersistentKeyboard()
    });
  });

  // Comando /help
  bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    console.log('🆘 Comando /help recibido');
    const helpMessage = `
*Comandos Disponibles:*
/start - Muestra el menú principal.
/help - Muestra este mensaje de ayuda.
/stopalert - (Solo Alert Managers) Cancela TODAS las alertas activas en este chat.
/report - (Solo Alert Managers) Genera y envía el reporte semanal Excel.
    `;
    bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
  });

  // Comando /stopalert
  bot.onText(/\/stopalert/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    console.log(`🚨 Comando /stopalert recibido de ${userId} en chat ${chatId}`);

    if (!isAlertManager(userId)) {
      console.log(`🚫 Usuario ${userId} no es Alert Manager.`);
      bot.sendMessage(chatId, '⛔ *Este comando solo puede ser usado por Alert Managers.*', { parse_mode: 'Markdown' });
      return;
    }

    try {
      // Check if there are any alerts in this chat first
      if (!activeAlerts[chatId] || Object.keys(activeAlerts[chatId]).length === 0) {
         bot.sendMessage(chatId, 'ℹ️ No hay alertas activas en este chat para cancelar.', { parse_mode: 'Markdown' });
         return;
      }

      const success = cancelAllAlertsForChat(chatId); // Function from alert.js
      if (success) {
        console.log(`✅ Todas las alertas canceladas en chat ${chatId} por ${userId}`);
        bot.sendMessage(chatId, '✅ *Alerta DESACTIVADA, ya se esta atendiendo la peticion, de la CONFERENCIA... GRACIAS!!!*', { parse_mode: 'Markdown' });
      } else {
        console.error(`❌ Error al intentar cancelar alertas en chat ${chatId}`);
        bot.sendMessage(chatId, '❌ *Ocurrió un error al intentar cancelar las alertas.*', { parse_mode: 'Markdown' });
      }
    } catch (error) {
      console.error(`❌ Error crítico en /stopalert para chat ${chatId}:`, error);
      bot.sendMessage(chatId, '❌ *Ocurrió un error crítico al procesar el comando /stopalert.*', { parse_mode: 'Markdown' });
    }
  });

  // Comando /report - ENVIAR EXCEL
  bot.onText(/\/report/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!isAlertManager(userId)) {
      return bot.sendMessage(chatId, '⛔ Solo los Alert Manager pueden ver el reporte.', { parse_mode: 'Markdown' });
    }
    
    try {
      const { generateExcel } = require('../services/report');
      
      // Generar Excel
      const excelBuffer = await generateExcel();
      
      // Crear un objeto File-like para el buffer
      const fileOptions = {
        filename: 'data.xlsx',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };
      
      // Enviar el archivo Excel
      await bot.sendDocument(chatId, excelBuffer, {
        caption: '📊 *Reporte de Maniobras*',
        filename: 'data.xlsx',
        parse_mode: 'Markdown'
      }, fileOptions);
      
      console.log(`✅ Reporte Excel enviado exitosamente a ${userId} en chat ${chatId}`);
    } catch (error) {
      console.error('Error en /report:', error);
      bot.sendMessage(chatId, '❌ *Error al generar reporte. Por favor, intenta nuevamente.*', { parse_mode: 'Markdown' });
    }
  });

  console.log('✅ Handlers de comandos registrados');
}

module.exports = setupCommandHandlers;