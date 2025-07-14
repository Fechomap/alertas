// src/services/maniobra.js
const mongoose = require('mongoose');
const { Maniobra } = require('../models');
const { isAlertManager } = require('../utils/permissions');
const { sendWithPersistentKeyboard } = require('../utils/keyboard-helper');
const keyboards = require('../ui/keyboards');

// Almacena los estados de usuarios
const userStates = {};

function startManiobrasFlow(bot, chatId, userId) {
  console.log('🔄 Iniciando flujo de maniobras para usuario:', userId);
  if (!isAlertManager(userId)) {
    sendWithPersistentKeyboard(bot, chatId, '⛔ *Solo los Alert Manager pueden registrar maniobras.*');
    return false;
  }

  if (mongoose.connection.readyState !== 1) {
    sendWithPersistentKeyboard(bot, chatId, '❌ *Error de conexión con la base de datos. Por favor, intente más tarde.*');
    return false;
  }

  // Enviar pregunta con teclado persistente, pero sin sugerencias de respuesta
  bot.sendMessage(chatId, '🔢 *¿Cuántas maniobras autorizadas? (1-10)*', {
    parse_mode: 'Markdown',
    reply_markup: keyboards.getPersistentKeyboard(),
    reply_to_message_id: undefined,
    allow_sending_without_reply: true,
    force_reply: undefined,
    selective: undefined
  });

  userStates[userId] = {
    chatId,
    step: 'awaiting_maniobras_quantity',
    data: {}
  };

  return true;
}

async function handleManiobrasState(bot, userId, text, chatId) {
  const state = userStates[userId];
  if (!state || state.chatId !== chatId) {return false;}

  try {
    console.log(`🔄 Procesando estado de maniobra: ${state.step} para usuario: ${userId}, texto: "${text}"`);
    switch (state.step) {
    case 'awaiting_maniobras_quantity': {
      const quantity = parseInt(text);
      if (isNaN(quantity) || quantity < 1 || quantity > 10) {
        sendWithPersistentKeyboard(bot, chatId, '❌ *Por favor, ingresa un número válido entre 1 y 10.*');
        return true;
      }

      state.data.quantity = quantity;
      state.step = 'confirming_maniobras';

      // Enviar confirmación con botones especiales (NO persistente)
      const confirmMessage = `*¿Confirmas el registro de ${quantity} maniobras?*`;

      await sendWithPersistentKeyboard(bot, chatId, confirmMessage, {
        forceReplyMarkup: keyboards.getConfirmationKeyboard()
      });
      return true;
    }

    case 'confirming_maniobras': {
      if (text === '✅ Confirmar') {
        const groupInfo = await bot.getChat(chatId);
        const groupName = groupInfo.title || `Grupo ${chatId}`;

        const maniobra = new Maniobra({
          chatId: chatId.toString(),
          groupName,
          alertManagerId: userId,
          maniobras: state.data.quantity,
          descripcion: `Registro de ${state.data.quantity} maniobras autorizadas`
        });

        await maniobra.save();

        const confirmMessage = '✅ *Maniobras registradas exitosamente*\n\n' +
                             `🏢 *Grupo:* ${groupName}\n` +
                             `🔢 *Cantidad:* ${state.data.quantity}\n` +
                             `📅 *Fecha:* ${new Date().toLocaleDateString('es-MX')}`;

        // Volver al teclado persistente
        sendWithPersistentKeyboard(bot, chatId, confirmMessage);
        delete userStates[userId];
        return true;

      } else if (text === '❌ Cancelar') {
        // Volver al teclado persistente
        sendWithPersistentKeyboard(bot, chatId, '❌ *Registro de maniobras cancelado.*');
        delete userStates[userId];
        return true;
      }
      return false;
    }

    default:
      return false;
    }
  } catch (error) {
    console.error('❌ Error en handleManiobrasState:', error);
    sendWithPersistentKeyboard(bot, chatId, '❌ *Ocurrió un error interno al procesar el estado de maniobras.*');
    delete userStates[userId];
    return false;
  }
}

function clearUserStates(chatId) {
  for (const userId in userStates) {
    if (userStates[userId]?.chatId === chatId) {
      delete userStates[userId];
    }
  }
}

module.exports = {
  startManiobrasFlow,
  handleManiobrasState,
  clearUserStates,
  userStates
};