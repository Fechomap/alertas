// src/handlers/messages.js
const buttonActions = require('../config/constants').buttonActions;
console.log('🔍 DEBUG - buttonActions cargado:', buttonActions);

const keyboards = require('../ui/keyboards');
const { isOperator, isAlertManager } = require('../utils/permissions');
const { handleOperatorAction, handleAlertManagerDeactivation } = require('../services/alert');
const { startManiobrasFlow, handleManiobrasState } = require('../services/maniobra');

// Updated to use inline keyboard
function sendMainMenu(bot, chatId) {
  console.log('📋 Enviando menú principal (inline) a:', chatId);
  bot.sendMessage(chatId, 'Menú principal:', {
    reply_markup: keyboards.getMainMenuKeyboard(), // Uses inline_keyboard now
    parse_mode: 'Markdown'
  });
}

// Updated to use inline keyboard
// Note: This function might not be called directly anymore if menus are edited via callback_query
// Keeping it for potential direct use or if editing fails
function sendApoyoMenu(bot, chatId) {
  console.log('📋 Enviando menú APOYO (inline) a:', chatId);
  bot.sendMessage(chatId, 'Menú de APOYO. Selecciona una opción:', {
    reply_markup: keyboards.getApoyoMenuKeyboard(), // Uses inline_keyboard now
    parse_mode: 'Markdown'
  });
}

function setupMessageHandlers(bot) {
  console.log('🔄 Configurando handler de mensajes...');
  // Make the callback async to allow await inside
  bot.on('message', async (msg) => { 
    console.log('📨 Mensaje recibido:', msg.text || 'sin texto');
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text ? msg.text.trim() : '';
    // const from = msg.from; // 'from' is not used below anymore

    console.log(`👤 Usuario ${userId} envió mensaje de texto: "${text}"`);
    
    // --- IMPORTANT: Button logic removed ---
    // Inline buttons are handled by callback_query.js now.
    // We only need to handle text input, primarily for the Maniobras flow.

    // Manejar estados de maniobras (e.g., receiving the quantity)
    try {
      // Pass text directly to handleManiobrasState
      const handledByManiobras = await handleManiobrasState(bot, userId, text, chatId);
      
      if (handledByManiobras) {
        console.log('🔄 Mensaje de texto procesado por handleManiobrasState');
        // No need for the setTimeout and sendMainMenu here, 
        // as the callback handler now manages post-confirmation actions.
        return; // Stop further processing if handled by maniobras state
      }
    } catch (error) {
      console.error('❌ Error en handleManiobrasState (desde messages.js):', error);
      // Don't return here, maybe it's a regular message
    }

    // If the message was not handled by maniobras state, 
    // check if it's from the persistent keyboard button
    if (text === '🏠 Menú Principal') {
      console.log('🏠 Botón de Menú Principal presionado, simulando /start');
      // Clear any pending states
      const { clearUserStates } = require('../services/maniobra');
      clearUserStates(chatId);
      // Send the main menu (same behavior as /start command)
      sendMainMenu(bot, chatId);
      return;
    }
    
    // Log unhandled messages
    console.log(`💬 Mensaje de texto no procesado por otros handlers: "${text}"`);
    
    // Example: Respond to unknown text messages
    // if (!text.startsWith('/')) { // Avoid interfering with commands
    //   bot.sendMessage(chatId, "Recibí tu mensaje, pero no sé cómo procesarlo. Usa los botones del menú.");
    // }
  });
  console.log('✅ Handler de mensajes registrado correctamente');
}

module.exports = {
  setupMessageHandlers,
  sendMainMenu,
  sendApoyoMenu
};
