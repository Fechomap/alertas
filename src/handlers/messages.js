const { buttonActions } = require('../config/constants');
const keyboards = require('../ui/keyboards');
const { isOperator, isAlertManager } = require('../utils/permissions');
const { handleOperatorAction, handleAlertManagerDeactivation } = require('../services/alert');
const { startManiobrasFlow, handleManiobrasState } = require('../services/maniobra');

function sendMainMenu(bot, chatId) {
  bot.sendMessage(chatId, 'Menú principal:', {
    reply_markup: keyboards.getMainMenuKeyboard(),
    parse_mode: 'Markdown'
  });
}

function sendApoyoMenu(bot, chatId) {
  bot.sendMessage(chatId, 'Menú de APOYO. Selecciona una opción:', {
    reply_markup: keyboards.getApoyoMenuKeyboard(),
    parse_mode: 'Markdown'
  });
}

function setupMessageHandlers(bot) {
  bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text ? msg.text.trim() : '';
    const from = msg.from;

    // Manejar botón de regreso
    if (text === '🔙 Regresar') {
      sendMainMenu(bot, chatId);
      return;
    }

    // Manejar estados de maniobras
    if (handleManiobrasState(bot, userId, text, chatId)) {
      // Si el mensaje fue procesado por handleManiobrasState, salir
      setTimeout(() => {
        if (text === '✅ Confirmar' || text === '❌ Cancelar') {
          sendMainMenu(bot, chatId);
        }
      }, 1000);
      return;
    }

    // Manejar acciones de botones
    if (buttonActions[text]) {
      const action = buttonActions[text];

      if (action === 'APOYO') {
        sendApoyoMenu(bot, chatId);
        return;
      }

      if (action === 'Maniobras') {
        if (startManiobrasFlow(bot, chatId, userId)) {
          return;
        }
      }

      if (isOperator(userId)) {
        handleOperatorAction(bot, action, chatId, userId, from);
      } else if (isAlertManager(userId)) {
        handleAlertManagerDeactivation(bot, action, chatId, userId);
      }
    }
  });
}

module.exports = {
  setupMessageHandlers,
  sendMainMenu,
  sendApoyoMenu
};
