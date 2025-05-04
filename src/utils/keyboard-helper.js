// src/utils/keyboard-helper.js
const keyboards = require('../ui/keyboards');

function sendWithPersistentKeyboard(bot, chatId, text, options = {}) {
  if (options.forceReplyMarkup) {
    const { forceReplyMarkup, ...restOptions } = options;
    return bot.sendMessage(chatId, text, { 
      ...restOptions,
      parse_mode: 'Markdown',
      reply_markup: forceReplyMarkup,
      // Explícitamente sin respuesta sugerida
      reply_to_message_id: undefined
    });
  }
  
  const defaultOptions = {
    parse_mode: 'Markdown',
    reply_markup: keyboards.getPersistentKeyboard(),
    // Asegurar que no hay respuesta sugerida
    reply_to_message_id: undefined,
    allow_sending_without_reply: true
  };
  
  const finalOptions = {
    ...defaultOptions,
    ...options,
    reply_markup: keyboards.getPersistentKeyboard(),
    reply_to_message_id: undefined
  };
  
  return bot.sendMessage(chatId, text, finalOptions);
}

module.exports = {
  sendWithPersistentKeyboard
};