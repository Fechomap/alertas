const mongoose = require('mongoose');
const { Maniobra } = require('../models');
const keyboards = require('../ui/keyboards');
const { isAlertManager } = require('../utils/permissions');

// Almacena los estados de usuarios
const userStates = {};

function startManiobrasFlow(bot, chatId, userId) {
  console.log('🔄 Iniciando flujo de maniobras para usuario:', userId);
  if (!isAlertManager(userId)) {
    bot.sendMessage(chatId, '⛔ *Solo los Alert Manager pueden registrar maniobras.*', {
      parse_mode: 'Markdown'
    });
    return false;
  }

  if (mongoose.connection.readyState !== 1) {
    bot.sendMessage(chatId, '❌ *Error de conexión con la base de datos. Por favor, intente más tarde.*', {
      parse_mode: 'Markdown'
    });
    return false;
  }

  bot.sendMessage(chatId, '🔢 *¿Cuántas maniobras autorizadas? (1-10)*', {
    parse_mode: 'Markdown',
    reply_markup: { remove_keyboard: true }
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
  if (!state || state.chatId !== chatId) return false;

  try {
    console.log(`🔄 Procesando estado de maniobra: ${state.step} para usuario: ${userId}, texto: "${text}"`);
    switch (state.step) {
      case 'awaiting_maniobras_quantity':
        const quantity = parseInt(text);
        if (isNaN(quantity) || quantity < 1 || quantity > 10) {
          bot.sendMessage(chatId, '❌ *Por favor, ingresa un número válido entre 1 y 10.*', {
            parse_mode: 'Markdown'
          });
          return true;
        }

        state.data.quantity = quantity;
        state.step = 'confirming_maniobras';

        bot.sendMessage(chatId, 
          `*¿Confirmas el registro de ${quantity} maniobras?*\n\n` +
          `Presiona: ✅ Confirmar o ❌ Cancelar`, {
          parse_mode: 'Markdown',
          reply_markup: keyboards.getConfirmationKeyboard()
        });
        return true;

      case 'confirming_maniobras':
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

          const confirmMessage = `✅ *Maniobras registradas exitosamente*\n\n` +
                             `🏢 *Grupo:* ${groupName}\n` +
                             `🔢 *Cantidad:* ${state.data.quantity}\n` +
                             `📅 *Fecha:* ${new Date().toLocaleDateString('es-MX')}`;

          bot.sendMessage(chatId, confirmMessage, {
            parse_mode: 'Markdown'
          });

          delete userStates[userId];
          return true;
          
        } else if (text === '❌ Cancelar') {
          bot.sendMessage(chatId, '❌ *Registro de maniobras cancelado.*', {
            parse_mode: 'Markdown'
          });
          delete userStates[userId];
          return true;
        }
        return false;
        
      default:
        return false;
    }
  } catch (error) {
    console.error('❌ Error en handleManiobrasState:', error);
    bot.sendMessage(chatId, '❌ *Ocurrió un error interno al procesar el estado de maniobras. Por favor, intenta nuevamente.*', {
      parse_mode: 'Markdown'
    });
    // Clear the state on error to prevent getting stuck
    delete userStates[userId]; 
    // Return false because the message was NOT successfully handled by the state machine
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
