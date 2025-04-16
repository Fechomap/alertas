const { alertTypes, cancelationMessages } = require('../config/constants');
const { getUserName } = require('../utils/permissions');

// Almacena alertas activas
const activeAlerts = {};

function startAlert(bot, userId, alertType, chatId, userName) {
  try {
    const alertInfo = alertTypes[alertType];
    if (!alertInfo) return;

    if (!activeAlerts[chatId]) activeAlerts[chatId] = {};
    if (!activeAlerts[chatId][userId]) activeAlerts[chatId][userId] = {};

    if (activeAlerts[chatId][userId][alertType]?.interval) {
      clearInterval(activeAlerts[chatId][userId][alertType].interval);
      delete activeAlerts[chatId][userId][alertType];
    }

    const userAlerts = activeAlerts[chatId][userId];
    if (Object.keys(userAlerts).length >= 2) {
      bot.sendMessage(chatId, '🚫 *Ya tienes el máximo de dos alertas activas.*', { parse_mode: 'Markdown' });
      return;
    }

    const message = alertInfo.message;
    let intervalId;
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
      .then(() => {
        intervalId = setInterval(() => {
          bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
            .catch(error => {
              console.error(`Error en intervalo: ${error}`);
              clearInterval(intervalId);
              delete activeAlerts[chatId][userId][alertType];
            });
        }, 20000);
        activeAlerts[chatId][userId][alertType] = {
          interval: intervalId,
          message: message,
          userName: userName
        };
      })
      .catch(error => {
        console.error(`Error iniciando alerta: ${error}`);
        if (intervalId) clearInterval(intervalId);
      });
  } catch (error) {
    console.error(`Error en startAlert para ${chatId}/${userId}/${alertType}:`, error);
    bot.sendMessage(chatId, '❌ *Error al iniciar alerta. Por favor, intenta nuevamente.*', { parse_mode: 'Markdown' });
  }
}

function stopAlertForUser(chatId, targetUserId, alertType) {
  try {
    if (activeAlerts[chatId]?.[targetUserId]?.[alertType]) {
      clearInterval(activeAlerts[chatId][targetUserId][alertType].interval);
      delete activeAlerts[chatId][targetUserId][alertType];
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error en stopAlertForUser para ${chatId}/${targetUserId}/${alertType}:`, error);
    return false;
  }
}

function cancelAllAlertsForChat(chatId) {
  try {
    if (activeAlerts[chatId]) {
      for (const userId in activeAlerts[chatId]) {
        for (const alertType in activeAlerts[chatId][userId]) {
          if (activeAlerts[chatId][userId][alertType]?.interval) {
            clearInterval(activeAlerts[chatId][userId][alertType].interval);
          }
        }
      }
      delete activeAlerts[chatId];
    }
    return true;
  } catch (error) {
    console.error('Error en cancelAllAlertsForChat:', error);
    return false;
  }
}

function handleOperatorAction(bot, alertType, chatId, userId, from) {
  switch (alertType) {
    case 'Conferencia':
    case 'USUARIO_NO_ESTA_EN_VH':
    case 'VALIDACION_DE_ORIGEN':
      startAlert(bot, userId, alertType, chatId, getUserName(from));
      break;
    default:
      break;
  }
}

function handleAlertManagerDeactivation(bot, alertType, chatId) {
  try {
    let alertFound = false;
    const chatOperatorsAlerts = activeAlerts[chatId] || {};
    
    for (const operatorId in chatOperatorsAlerts) {
      if (chatOperatorsAlerts[operatorId]?.[alertType]) {
        stopAlertForUser(chatId, operatorId, alertType);
        
        const message = cancelationMessages[alertType] || '🚫 *No se encontró mensaje de cancelación.*';
        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        
        alertFound = true;
        break;
      }
    }
    
    if (!alertFound) {
      bot.sendMessage(chatId, '🚫 *No se encontró una alerta activa para cancelar.*', { parse_mode: 'Markdown' });
    }
    
    return alertFound;
  } catch (error) {
    console.error(`Error en handleAlertManagerDeactivation para ${chatId}/${alertType}:`, error);
    return false;
  }
}

module.exports = {
  startAlert,
  stopAlertForUser,
  cancelAllAlertsForChat,
  handleOperatorAction,
  handleAlertManagerDeactivation,
  activeAlerts
};
