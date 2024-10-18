// Cargar variables de entorno
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');

// Crear instancia de Express
const app = express();
app.use(bodyParser.json());

// Cargar el token desde las variables de entorno
const token = process.env.TELEGRAM_BOT_TOKEN;

// URL de tu aplicación en Heroku
const url = process.env.HEROKU_APP_URL || 'https://chubb-bot-0dd0033c99dc.herokuapp.com'; // Reemplaza con tu URL real

// Crear el bot utilizando webhooks
const bot = new TelegramBot(token, { webHook: true });

// Definir la ruta del webhook
const webhookPath = `/bot${token}`;
bot.setWebHook(`${url}${webhookPath}`);

// IDs de usuarios
const operatorIds = [7143094298, 7754458578, 7509818905, 8048487029]; // IDs de los operadores que pueden iniciar alertas
const alertManagerIds = [1022124142, 7758965062, 5660087041, 6330970125]; // IDs de los usuarios que pueden detener alertas

// Estructuras para almacenar alertas y estados
let activeAlerts = {}; // Estructura: { chatId: { userId: { alertType: { interval, userName } } } }
let globalActiveAlerts = {}; // Para alertas TR y HORA_DE_ESPERA por chat
let userStates = {}; // Estructura: { userId: { chatId, step, data } }

// Mapeo de alertas
const alertTypes = {
  Conferencia: {
    message: '⚠️⚠️ Cabina, por favor apóyame con una conferencia. ¡Gracias! 📞'
  },
  Maniobras: {
    message: '' // Se generará dinámicamente en MANIOBRAS
  },
  USUARIO_NO_ESTA_EN_VH: {
    message: '⚠️⚠️ Cabina, por favor apóyame avisando al usuario que salga. ¡Gracias! 🚗'
  },
  TR: {
    message: '' // TR tiene alertas programadas
  },
  HORA_DE_ESPERA: {
    message: '' // HORA_DE_ESPERA tiene alertas programadas
  },
  VALIDACION_DE_ORIGEN: {
    message: '⚠️⚠️ Cabina, por favor apóyame con la validación del origen. ¡Gracias! 📍'
  }
};

// Mapeo de mensajes de cancelación
const cancelationMessages = {
  'Conferencia': '🆗🆗 *CONFERENCIA* atendida. 📞 Enseguida le llaman. Alerta desactivada. ¡Gracias! ✔️',
  'Maniobras': '🆗🆗 *MANIOBRAS* atendidas. 🔧 En breve se notificará quién las cubre. Alerta desactivada. ¡Gracias! ✔️',
  'USUARIO_NO_ESTA_EN_VH': '🆗🆗 Se está gestionando el contacto con el usuario para que salga. 📞 Alerta desactivada. ¡Gracias! ✔️',
  'VALIDACION_DE_ORIGEN': '🆗🆗 Se está gestionando el contacto con el usuario para verificar su ubicación. 📞 Alerta desactivada. ¡Gracias! ✔️',
  'TR': '🛎️🛎️ *TIEMPO REGLAMENTARIO* completado con éxito. Alerta desactivada. ¡Gracias! ✔️',
  'HORA_DE_ESPERA': '🛎️🛎️ *HORA DE ESPERA* completada con éxito. Alerta desactivada. ¡Gracias! ✔️'
};

// Mapeo de botones a tipos de alerta
const buttonActions = {
  '📞 CONFERENCIA': 'Conferencia',
  '🚗 MANIOBRAS': 'Maniobras',
  '🚫 NA NO ESTA EN VH': 'USUARIO_NO_ESTA_EN_VH',
  '🔍 VALIDAR ORIGEN': 'VALIDACION_DE_ORIGEN',
  '🕒 TR': 'TR',
  '⏳ HR': 'HORA_DE_ESPERA'
};

// Funciones para verificar roles
function isOperator(userId) {
  return operatorIds.includes(userId);
}

function isAlertManager(userId) {
  return alertManagerIds.includes(userId);
}

// Función para obtener el nombre completo del usuario
function getUserName(user) {
  const firstName = user.first_name || '';
  const lastName = user.last_name || '';
  return `${firstName} ${lastName}`.trim();
}

// Función para normalizar texto (eliminar emojis y espacios adicionales)
function normalizeText(text) {
  return text.replace(/[^\p{L}\p{N}\s]/gu, '').trim().toLowerCase();
}

// Función para enviar el teclado del menú principal
function sendMainMenu(chatId) {
  const keyboard = {
    keyboard: [
      ['📞 CONFERENCIA', '🚗 MANIOBRAS'],
      ['🚫 NA NO ESTA EN VH', '🔍 VALIDAR ORIGEN'],
      ['🕒 TR', '⏳ HR']
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  };

  // Enviar el mensaje con el menú
  bot.sendMessage(chatId, 'Menú principal:', {
    reply_markup: keyboard,
    parse_mode: 'Markdown'
  });
}

// Manejar el comando /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  sendMainMenu(chatId);
});

// Manejar mensajes y acciones
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text ? msg.text.trim() : '';
  const from = msg.from;

  // Ignorar mensajes de bots y el comando /start
  if (msg.from.is_bot || text === '/start') return;

  // Manejar estados de conversación (e.g., Maniobras)
  if (userStates[userId] && userStates[userId].chatId === chatId) {
    handleUserState(userId, text, chatId, from);
    return;
  }

  // Verificar si el texto corresponde a una acción
  if (buttonActions[text]) {
    const alertType = buttonActions[text];
    const isOperatorUser = isOperator(userId);
    const isAlertManagerUser = isAlertManager(userId);

    if (alertType === 'TR' || alertType === 'HORA_DE_ESPERA') {
      // Solo alertManagerIds pueden activar estas alertas
      if (isAlertManagerUser) {
        handleAlertManagerAction(alertType, chatId, userId, from);
      } else {
        // No hacer nada para operatorIds
        return;
      }
    } else {
      if (isOperatorUser) {
        handleOperatorAction(alertType, chatId, userId, from);
      } else if (isAlertManagerUser) {
        handleAlertManagerDeactivation(alertType, chatId, userId, from);
      } else {
        // Usuario sin permisos, no hacer nada
        return;
      }
    }
  } else {
    // Ignorar mensajes no reconocidos
    return;
  }
});

// Función para manejar acciones de operatorIds
function handleOperatorAction(alertType, chatId, userId, from) {
  switch (alertType) {
    case 'Conferencia':
    case 'USUARIO_NO_ESTA_EN_VH':
    case 'VALIDACION_DE_ORIGEN':
      startAlert(userId, alertType, chatId, getUserName(from));
      break;
    case 'Maniobras':
      // Confirmación antes de proceder
      bot.sendMessage(chatId, '🛠️ *Estás iniciando el proceso de solicitud de maniobras, ¿deseas CONTINUAR?*', {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [['✅ Continuar', '❌ Cancelar']],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      });
      userStates[userId] = { chatId, step: 'confirming_maniobras', data: {} };
      break;
    default:
      // Acción desconocida, no hacer nada
      return;
  }
}

// Función para manejar acciones de alertManagerIds (TR y HORA_DE_ESPERA)
function handleAlertManagerAction(alertType, chatId, userId, from) {
  const chatAlerts = globalActiveAlerts[chatId] || {};
  switch (alertType) {
    case 'TR':
      if (chatAlerts['TR']) {
        // TR ya está activa, no hacer nada
        return;
      }
      if (chatAlerts['HORA_DE_ESPERA']) {
        // No se puede activar TR si HORA_DE_ESPERA está activa
        return;
      }
      // Enviar mensaje de inicio al grupo
      bot.sendMessage(chatId, '⏰⏰ Se ha iniciado el contador de 20 minutos para TIEMPO REGLAMENTARIO. ⏳ Se enviarán recordatorios al grupo.', { parse_mode: 'Markdown' });
      // Iniciar alerta de TR
      chatAlerts['TR'] = {
        active: true,
        userId: userId,
        userName: getUserName(from)
      };
      globalActiveAlerts[chatId] = chatAlerts;
      // Programar mensajes de TR
      manageTimedAlertGlobal(chatId, 'TR', '⏳⏳ **TIEMPO REGLAMENTARIO:** Estamos a la mitad del tiempo. 🔔 Si es posible, realiza una conferencia de nuevo.', 600000); // 10 min
      manageTimedAlertGlobal(chatId, 'TR', '⏳⏳ **TIEMPO REGLAMENTARIO:** El tiempo ha finalizado. ✅', 1200000); // 20 min
      break;
    case 'HORA_DE_ESPERA':
      if (chatAlerts['HORA_DE_ESPERA']) {
        // HORA_DE_ESPERA ya está activa, no hacer nada
        return;
      }
      if (chatAlerts['TR']) {
        // No se puede activar HORA_DE_ESPERA si TR está activa
        return;
      }
      // Enviar mensaje de inicio al grupo
      bot.sendMessage(chatId, '⏰⏰ Se ha iniciado el contador de 60 minutos para la HORA DE ESPERA. ⏳ Se enviarán recordatorios al grupo.', { parse_mode: 'Markdown' });
      // Iniciar alerta de HORA_DE_ESPERA
      chatAlerts['HORA_DE_ESPERA'] = {
        active: true,
        userId: userId,
        userName: getUserName(from)
      };
      globalActiveAlerts[chatId] = chatAlerts;
      // Programar mensajes de HORA_DE_ESPERA
      manageTimedAlertGlobal(chatId, 'HORA_DE_ESPERA', '⏳⏳ **HORA DE ESPERA:** Quedan 15 minutos para que finalice. 🔔 Si es posible, realiza una conferencia de nuevo.', 2700000); // 45 min
      manageTimedAlertGlobal(chatId, 'HORA_DE_ESPERA', '⏳⏳ **HORA DE ESPERA:** El tiempo ha finalizado. ✅', 3600000); // 60 min
      break;
    default:
      // Acción desconocida, no hacer nada
      return;
  }
}

// Función para manejar desactivación de alertas por alertManagerIds
function handleAlertManagerDeactivation(alertType, chatId, userId, from) {
  let alertFound = false;
  if (alertType === 'TR' || alertType === 'HORA_DE_ESPERA') {
    const chatAlerts = globalActiveAlerts[chatId] || {};
    if (chatAlerts[alertType]) {
      delete chatAlerts[alertType];
      globalActiveAlerts[chatId] = chatAlerts;
      const message = cancelationMessages[alertType] || `🆗🆗 **ALERTA DE ${alertType.replace(/_/g, ' ')} CANCELADA.**`;
      // Enviar mensaje de cancelación al grupo
      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      alertFound = true;
    }
  } else {
    // Desactivar la alerta si fue activada por un operatorId
    const chatOperatorsAlerts = activeAlerts[chatId] || {};
    for (const operatorId of operatorIds) {
      if (chatOperatorsAlerts[operatorId] && chatOperatorsAlerts[operatorId][alertType]) {
        stopAlertForUser(chatId, operatorId, alertType);
        const message = cancelationMessages[alertType] || `🆗🆗 **ALERTA DE ${alertType.replace(/_/g, ' ')} CANCELADA.**`;
        // Enviar mensaje de cancelación al grupo
        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        alertFound = true;
        break; // Asumiendo que detenemos la primera que encontramos
      }
    }
  }
  if (!alertFound) {
    // No hay alerta activa para desactivar, no hacer nada
    return;
  }
}

// Manejar estados de conversación
function handleUserState(userId, text, chatId, from) {
  const state = userStates[userId];
  if (state.chatId !== chatId) {
    // Ignorar mensajes de otros chats
    return;
  }
  const normalizedText = normalizeText(text);
  switch (state.step) {
    case 'confirming_maniobras':
      if (normalizedText === 'continuar' || normalizedText === 'si') {
        bot.sendMessage(chatId, '🔢 ¿Cuántas maniobras necesita?', {
          parse_mode: 'Markdown',
          reply_markup: {
            remove_keyboard: true
          }
        });
        state.step = 'awaiting_maniobras_quantity';
      } else if (normalizedText === 'cancelar' || normalizedText === 'no') {
        // Cancelar y regresar al menú principal
        delete userStates[userId];
        sendMainMenu(chatId);
      } else {
        bot.sendMessage(chatId, 'Por favor, selecciona una opción válida.', { parse_mode: 'Markdown' });
      }
      break;
    case 'awaiting_maniobras_quantity':
      const quantity = parseInt(text);
      if (isNaN(quantity) || quantity <= 0) {
        bot.sendMessage(chatId, '❌ *Por favor, ingresa un número válido de maniobras.*', { parse_mode: 'Markdown' });
        return;
      }
      state.data.quantity = quantity;
      state.step = 'awaiting_maniobras_description';
      bot.sendMessage(chatId, '✏️ Indícame por favor qué maniobras estará realizando.', { parse_mode: 'Markdown' });
      break;
    case 'awaiting_maniobras_description':
      const description = text.trim();
      if (description.length === 0) {
        bot.sendMessage(chatId, '❌ *Por favor, ingresa una descripción válida.*', { parse_mode: 'Markdown' });
        return;
      }
      const alertText = `⚠️⚠️ Cabina, se requieren ${state.data.quantity} maniobras. Se realizará: ${description}. Quedo al pendiente de la autorización. ¡Gracias! 🔧`;
      alertTypes.Maniobras.message = alertText; // Actualizar el mensaje de la alerta MANIOBRAS
      startAlert(userId, 'Maniobras', chatId, getUserName(from));
      delete userStates[userId];
      // Regresar al menú principal
      sendMainMenu(chatId);
      break;
    default:
      delete userStates[userId];
      // Estado desconocido, no hacer nada
      return;
  }
}

// Función para iniciar una alerta
function startAlert(userId, alertType, chatId, userName) {
  const alertInfo = alertTypes[alertType];
  if (!alertInfo) {
    // Tipo de alerta desconocido, no hacer nada
    return;
  }

  if (!activeAlerts[chatId]) {
    activeAlerts[chatId] = {};
  }
  if (!activeAlerts[chatId][userId]) {
    activeAlerts[chatId][userId] = {};
  }

  // Verificar si la alerta ya está activa
  if (activeAlerts[chatId][userId][alertType]) {
    // Ya existe una alerta de este tipo, no hacer nada
    return;
  }

  // Implementar la regla de máximo dos alertas activas por usuario, excluyendo TR y HORA_DE_ESPERA
  const userAlerts = activeAlerts[chatId][userId];
  const alertCount = Object.keys(userAlerts).filter(type => type !== 'TR' && type !== 'HORA_DE_ESPERA').length;
  if (alertCount >= 2) {
    // Máximo de dos alertas activas alcanzado, enviar mensaje al usuario
    bot.sendMessage(chatId, '🚫 *Ya tienes el máximo de dos alertas activas.*', { parse_mode: 'Markdown' });
    return;
  }

  const message = alertInfo.message;

  // Enviar la primera alerta inmediatamente al chat
  bot.sendMessage(chatId, message, { parse_mode: 'Markdown' }).then(() => {
    // Guardar la alerta con su tipo y nombre de usuario
    activeAlerts[chatId][userId][alertType] = {
      interval: setInterval(() => {
        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' }).catch(() => {});
      }, 20000), // Intervalo fijo de 20 segundos
      message: message,
      userName: userName
    };
  }).catch(() => {});
}

// Función para manejar alertas programadas para TR y HORA_DE_ESPERA
function manageTimedAlertGlobal(chatId, alertType, message, delay) {
  setTimeout(() => {
    const chatAlerts = globalActiveAlerts[chatId] || {};
    // Verificar si la alerta global no ha sido detenida
    if (chatAlerts[alertType] && chatAlerts[alertType].active) {
      bot.sendMessage(chatId, `${message}`, { parse_mode: 'Markdown' }).catch(() => {});
      // Si este es el mensaje final, desactivar la alerta
      if (message.includes('ha finalizado')) {
        delete chatAlerts[alertType];
        globalActiveAlerts[chatId] = chatAlerts;
      }
    }
  }, delay);
}

// Función para detener una alerta específica para un usuario
function stopAlertForUser(chatId, targetUserId, alertType) {
  if (activeAlerts[chatId] && activeAlerts[chatId][targetUserId] && activeAlerts[chatId][targetUserId][alertType]) {
    // Si es una alerta con intervalos
    if (activeAlerts[chatId][targetUserId][alertType].interval) {
      clearInterval(activeAlerts[chatId][targetUserId][alertType].interval);
    }
    // Eliminar la alerta
    delete activeAlerts[chatId][targetUserId][alertType];
  }
}

// Manejar errores de polling (ya no se usará polling, pero se puede mantener por seguridad)
bot.on('polling_error', (error) => {
  console.error('❌ Error de polling:', error);
});

// Manejar excepciones no capturadas
process.on('uncaughtException', (err) => {
  console.error('❌ Excepción no capturada:', err);
  process.exit(1); // Salir del proceso para que Heroku lo reinicie si está en producción
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Rechazo de promesa no manejado:', reason);
  process.exit(1); // Salir del proceso para que Heroku lo reinicie si está en producción
});

// Configurar el webhook en Express para recibir actualizaciones
app.post(webhookPath, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Iniciar el servidor Express
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Bot funcionando en el puerto ${port}`);
});
