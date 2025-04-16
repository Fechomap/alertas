// src/handlers/callback_query.js
const keyboards = require('../ui/keyboards');
const { isOperator, isAlertManager } = require('../utils/permissions');
const { handleOperatorAction, handleAlertManagerDeactivation } = require('../services/alert');
const { startManiobrasFlow, handleManiobrasState } = require('../services/maniobra');
const { sendMainMenu, sendApoyoMenu } = require('./messages'); // Re-use menu sending functions

function setupCallbackQueryHandlers(bot) {
  console.log('🔄 Configurando handler de callback_query...');

  bot.on('callback_query', async (callbackQuery) => {
    const message = callbackQuery.message;
    const chatId = message.chat.id;
    const userId = callbackQuery.from.id;
    const action = callbackQuery.data; // This is the callback_data we defined
    const from = callbackQuery.from;

    console.log(`🖱️ Callback Query recibido: Acción=${action}, Usuario=${userId}, Chat=${chatId}`);

    // Answer the callback query to remove the "loading" state on the button
    bot.answerCallbackQuery(callbackQuery.id);

    // --- Navigation ---
    if (action === 'MAIN_MENU') {
      console.log('🔙 Regresando al menú principal (callback)');
      // Edit the existing message to show the main menu
      bot.editMessageText('Menú principal:', {
        chat_id: chatId,
        message_id: message.message_id,
        reply_markup: keyboards.getMainMenuKeyboard(),
        parse_mode: 'Markdown'
      }).catch(err => console.error("Error editando mensaje a Main Menu:", err));
      return;
    }

    // --- Maniobras Confirmation ---
    // Check if this callback is related to maniobras confirmation
    if (action === 'CONFIRM' || action === 'CANCEL') {
      console.log(`🔄 Procesando confirmación de maniobras (callback): ${action}`);
      // We need to simulate a text message for handleManiobrasState
      // Map CONFIRM -> '✅ Confirmar', CANCEL -> '❌ Cancelar'
      const simulatedText = action === 'CONFIRM' ? '✅ Confirmar' : '❌ Cancelar';
      try {
        const handled = await handleManiobrasState(bot, userId, simulatedText, chatId);
        if (handled) {
          console.log('✅ Confirmación de maniobras procesada por handleManiobrasState');
          // Edit the confirmation message with a success message but don't return to main menu
           bot.editMessageText('✅ *Maniobra registrada correctamente.*\n\nPuedes usar el botón "🏠 Menú Principal" para volver al menú principal cuando lo necesites.', { 
             chat_id: chatId,
             message_id: message.message_id,
             reply_markup: null, // Remove buttons
             parse_mode: 'Markdown'
           }).catch(err => console.error("Error editando mensaje post-maniobra:", err));
           // No longer automatically returning to main menu to keep the persistent keyboard visible
          return;
        } else {
           console.log('⚠️ Confirmación de maniobras no procesada por handleManiobrasState');
        }
      } catch (error) {
        console.error('❌ Error en handleManiobrasState desde callback:', error);
      }
      // Fall through if not handled (shouldn't happen often)
    }


    // --- Main Actions ---
    switch (action) {
      case 'APOYO':
        console.log('🖱️ Acción APOYO detectada (callback)');
        // Edit the current message to show the Apoyo menu
         bot.editMessageText('Menú de APOYO. Selecciona una opción:', {
           chat_id: chatId,
           message_id: message.message_id,
           reply_markup: keyboards.getApoyoMenuKeyboard(),
           parse_mode: 'Markdown'
         }).catch(err => console.error("Error editando mensaje a Apoyo Menu:", err));
        break;

      case 'Maniobras':
        console.log('🖱️ Acción Maniobras detectada (callback)');
        try {
          // Maniobras flow starts by asking a question, so send a new message
          // Acknowledge the button press by editing the original message slightly
          bot.editMessageText('Iniciando flujo de Maniobras...', {
             chat_id: chatId,
             message_id: message.message_id,
             reply_markup: null // Remove buttons
           }).catch(err => console.error("Error editando mensaje pre-maniobra:", err));
          startManiobrasFlow(bot, chatId, userId); // This sends its own message
        } catch (error) {
          console.error('❌ Error en startManiobrasFlow desde callback:', error);
        }
        break;

      // --- Alert Actions (Only Conferencia now) ---
      case 'Conferencia':
        // Removed cases for 'USUARIO_NO_ESTA_EN_VH' and 'VALIDACION_DE_ORIGEN'
        console.log(`🖱️ Acción de Alerta detectada (callback): ${action}`);
        try {
          console.log(`👮 Verificando permisos para usuario ${userId} (callback)...`);
          if (isOperator(userId)) {
            console.log(`✅ Usuario ${userId} es OPERADOR. Ejecutando acción: ${action}`);
            // Acknowledge button press before starting alert
             bot.editMessageText(`Activando alerta: ${action}...`, {
               chat_id: chatId,
               message_id: message.message_id,
               reply_markup: null // Remove buttons
             }).catch(err => console.error("Error editando mensaje pre-alerta:", err));
            handleOperatorAction(bot, action, chatId, userId, from); // Sends its own messages
          } else if (isAlertManager(userId)) {
             // Alert Managers likely don't trigger alerts this way, but handle deactivation
             // For now, let's assume they might press it accidentally.
             console.log(`⚠️ Usuario ${userId} es ALERT MANAGER, no puede iniciar alerta ${action} directamente.`);
             bot.sendMessage(chatId, `⛔ *Los Alert Managers no inician alertas de tipo ${action} directamente.*`, { parse_mode: 'Markdown' });
             // Maybe send main menu again?
             // sendMainMenu(bot, chatId); 
          } else {
            console.log(`⚠️ Usuario ${userId} sin permisos para acción ${action} (callback)`);
            bot.sendMessage(chatId, '⛔ *No tienes permisos para ejecutar esta acción.*', { parse_mode: 'Markdown' });
          }
        } catch (error) {
          console.error(`❌ Error procesando acción de alerta ${action} desde callback:`, error);
        }
        break;

      default:
        console.log(`⚠️ Callback action no reconocida: ${action}`);
        bot.sendMessage(chatId, '❓ Acción no reconocida.');
        break;
    }
  });

  console.log('✅ Handler de callback_query registrado correctamente');
}

module.exports = { setupCallbackQueryHandlers };
