// src/handlers/messages.js
const buttonActions = require('../config/constants').buttonActions;
const { handleOperatorAction, handleAlertManagerDeactivation } = require('../services/alert');
const { startManiobrasFlow, handleManiobrasState } = require('../services/maniobra');
const { sendWithPersistentKeyboard } = require('../utils/keyboard-helper');
const { isOperator, isAlertManager } = require('../utils/permissions');

function sendMainMenu(bot, chatId) {
  console.log('📋 Enviando menú principal a:', chatId);
  sendWithPersistentKeyboard(bot, chatId, 'Menú principal:');
}

function setupMessageHandlers(bot) {
  console.log('🔄 Configurando handler de mensajes...');

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text ? msg.text.trim() : '';
    const from = msg.from;

    // Manejar estados de maniobras
    try {
      const handledByManiobras = await handleManiobrasState(bot, userId, text, chatId);
      if (handledByManiobras) {return;}
    } catch (error) {
      console.error('❌ Error en handleManiobrasState:', error);
    }

    // Manejar acciones de botones válidas
    if (buttonActions[text]) {
      const action = buttonActions[text];

      if (action === 'Conferencia') {
        if (isOperator(userId)) {
          handleOperatorAction(bot, action, chatId, userId, from);
        } else if (isAlertManager(userId)) {
          handleAlertManagerDeactivation(bot, action, chatId);
        }
        return;
      }

      if (action === 'Maniobras') {
        startManiobrasFlow(bot, chatId, userId);
        return;
      }
    }

    // No hacer nada si el mensaje no coincide con acciones conocidas
    return;
  });

  console.log('✅ Handler de mensajes registrado correctamente');
}

module.exports = {
  setupMessageHandlers,
  sendMainMenu
};