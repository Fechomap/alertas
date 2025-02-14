// 1. CONFIGURACIÓN INICIAL BOT
// 1.1 Importación de dependencias
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');

// 1.2 Configuración de Express
const app = express();
app.use(bodyParser.json());

// 1.3 Configuración de variables de entorno
const token = process.env.TELEGRAM_BOT_TOKEN;
const url = process.env.HEROKU_APP_URL || 'https://tu-app-en-heroku.herokuapp.com';

// 1.4 Configuración del Bot y Webhook
//const bot = new TelegramBot(token, { polling: true });
const bot = new TelegramBot(token, { webHook: true });
const webhookPath = `/bot${token}`;
bot.setWebHook(`${url}${webhookPath}`);

// 2. ESTRUCTURAS DE DATOS Y VARIABLES GLOBALES
// 2.1 IDs de usuarios autorizados
const operatorIds = [7143094298, 7754458578, 7509818905, 8048487029];
const alertManagerIds = [1022124142, 7758965062, 5660087041, 6330970125];
const SUPER_ADMIN_ID = 7143094298;

// 2.2 Estructuras de almacenamiento
const activeAlerts = {};    // Estructura: { chatId: { userId: { alertType: { interval, userName } } } }
const userStates = {};      // Estructura: { userId: { chatId, step, data } }

// 2.3 Definición de tipos de alertas (se han eliminado TR y HORA DE ESPERA)
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
  VALIDACION_DE_ORIGEN: {
    message: '⚠️⚠️ Cabina, por favor apóyame con la validación del origen. ¡Gracias! 📍'
  }
};

// 2.4 Mensajes de cancelación (se han eliminado TR y HR)
const cancelationMessages = {
  'Conferencia': '🆗🆗 *CONFERENCIA* atendida. 📞 Enseguida le llaman. Alerta desactivada. ¡Gracias! ✔️',
  'Maniobras': '🆗🆗 *MANIOBRAS* atendidas. 🔧 En breve se notificará quién las cubre. Alerta desactivada. ¡Gracias! ✔️',
  'USUARIO_NO_ESTA_EN_VH': '🆗🆗 Se está gestionando el contacto con el usuario para que salga. 📞 Alerta desactivada. ¡Gracias! ✔️',
  'VALIDACION_DE_ORIGEN': '🆗🆗 Se está gestionando el contacto con el usuario para verificar su ubicación. 📞 Alerta desactivada. ¡Gracias! ✔️'
};

// 2.5 Mapeo de botones a acciones
const buttonActions = {
  '🤝 APOYO': 'APOYO',
  '🚗 MANIOBRAS': 'Maniobras',
  '📞 CONFERENCIA': 'Conferencia',
  '🚫 NA NO ESTA EN VH': 'USUARIO_NO_ESTA_EN_VH',
  '🔍 VALIDAR ORIGEN': 'VALIDACION_DE_ORIGEN'
};

// 3. FUNCIONES DE UTILIDAD
// 3.1 Verificación de roles
function isOperator(userId) {
  return operatorIds.includes(userId);
}

function isAlertManager(userId) {
  return alertManagerIds.includes(userId);
}

function isSuperAdmin(userId) {
  return userId === SUPER_ADMIN_ID;
}

// 3.2 Gestión de información de usuario
function getUserName(user) {
  const firstName = user.first_name || '';
  const lastName = user.last_name || '';
  return `${firstName} ${lastName}`.trim();
}

// 3.3 Procesamiento de texto
function normalizeText(text) {
  return text.replace(/[^\p{L}\p{N}\s]/gu, '').trim().toLowerCase();
}

// 3.4 Interfaz de usuario

// Menú principal: Solo muestra dos botones: APOYO y MANIOBRAS
function sendMainMenu(chatId) {
  const keyboard = {
    keyboard: [
      ['🤝 APOYO', '🚗 MANIOBRAS']
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  };

  bot.sendMessage(chatId, 'Menú principal:', {
    reply_markup: keyboard,
    parse_mode: 'Markdown'
  });
}

// Menú de APOYO: Muestra las tres opciones y un botón para regresar
function sendApoyoMenu(chatId) {
  const keyboard = {
    keyboard: [
      ['📞 CONFERENCIA', '🚫 NA NO ESTA EN VH', '🔍 VALIDAR ORIGEN'],
      ['🔙 Regresar']
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  };

  bot.sendMessage(chatId, 'Menú de APOYO. Selecciona una opción:', {
    reply_markup: keyboard,
    parse_mode: 'Markdown'
  });
}

// 4. MANEJADORES DE EVENTOS
// 4.1 Manejador del comando /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  sendMainMenu(chatId);
});

// 4.2 Manejador principal de mensajes
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text ? msg.text.trim() : '';
  const from = msg.from;

  // 4.2.1 Validaciones iniciales
  if (msg.from.is_bot || text === '/start') return;

  // Manejo para el botón "Regresar" desde el submenú de APOYO
  if (text === '🔙 Regresar') {
    sendMainMenu(chatId);
    return;
  }

  // Manejo de estados de conversación
  if (userStates[userId] && userStates[userId].chatId === chatId) {
    handleUserState(userId, text, chatId, from);
    return;
  }

  // Procesamiento de acciones de botones
  if (buttonActions[text]) {
    const action = buttonActions[text];

    // Si se presiona APOYO, se envía el submenú de apoyo
    if (action === 'APOYO') {
      sendApoyoMenu(chatId);
      return;
    }

    const isOperatorUser = isOperator(userId);
    const isAlertManagerUser = isAlertManager(userId);

    // Para alertas: si es operador se inicia la alerta, si es manager se permite cancelar
    if (isOperatorUser) {
      handleOperatorAction(action, chatId, userId, from);
    } else if (isAlertManagerUser) {
      handleAlertManagerDeactivation(action, chatId, userId, from);
    }
  }
});

// 4.3 Manejador de acciones de operadores
function handleOperatorAction(alertType, chatId, userId, from) {
  switch (alertType) {
    case 'Conferencia':
    case 'USUARIO_NO_ESTA_EN_VH':
    case 'VALIDACION_DE_ORIGEN':
      startAlert(userId, alertType, chatId, getUserName(from));
      break;
    case 'Maniobras':
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
  }
}

// 4.4 Manejador de cancelación de alertas por alert manager (para alertas de operadores)
function handleAlertManagerDeactivation(alertType, chatId, userId, from) {
  try {
    let alertFound = false;
    const chatOperatorsAlerts = activeAlerts[chatId] || {};
    for (const operatorId in chatOperatorsAlerts) {
      if (chatOperatorsAlerts[operatorId]?.[alertType]) {
        stopAlertForUser(chatId, operatorId, alertType);
        const message = cancelationMessages[alertType];
        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        alertFound = true;
        break;
      }
    }
    if (!alertFound) {
      bot.sendMessage(chatId, '🚫 *No se encontró una alerta activa para cancelar.*', { parse_mode: 'Markdown' });
    }
  } catch (error) {
    console.error(`Error en handleAlertManagerDeactivation para ${chatId}/${alertType}:`, error);
  }
}

// 4.5 Comando de cancelación de alertas (por super administrador)
bot.onText(/\/cancelar_alertas/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (isSuperAdmin(userId)) {
    const success = cancelAllAlertsForChat(chatId);
    if (success) {
      await bot.sendMessage(chatId, '🔔 *Todas las alertas y procesos han sido cancelados por el Administrador.*', {
        parse_mode: 'Markdown'
      });
      setTimeout(() => sendMainMenu(chatId), 500);
    } else {
      await bot.sendMessage(chatId, '❌ *Error al cancelar las alertas. Por favor, intente de nuevo.*', {
        parse_mode: 'Markdown'
      });
    }
  } else {
    await bot.sendMessage(chatId, '⛔ *No tienes permisos para ejecutar este comando.*', {
      parse_mode: 'Markdown'
    });
  }
});

// 4.6 Comando de reinicio desde el bot (nuevo)
bot.onText(/\/restart/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (isSuperAdmin(userId)) {
    await bot.sendMessage(chatId, '🔄 *Reiniciando el servidor...*', { parse_mode: 'Markdown' });
    setTimeout(() => process.exit(1), 2000);
  } else {
    await bot.sendMessage(chatId, '⛔ *No tienes permisos para ejecutar este comando.*', { parse_mode: 'Markdown' });
  }
});

// 5. MANEJO DE ESTADOS DE CONVERSACIÓN
function handleUserState(userId, text, chatId, from) {
  const state = userStates[userId];
  if (state.chatId !== chatId) return;
  
  const normalizedText = normalizeText(text);

  switch (state.step) {
    case 'confirming_maniobras':
      handleManiobrasConfirmation(normalizedText, chatId, userId);
      break;
    case 'awaiting_maniobras_quantity':
      handleManiobrasQuantity(text, chatId, state);
      break;
    case 'awaiting_maniobras_description':
      handleManiobrasDescription(text, chatId, state, userId, from);
      break;
    default:
      delete userStates[userId];
      return;
  }
}

function handleManiobrasConfirmation(normalizedText, chatId, userId) {
  if (normalizedText === 'continuar' || normalizedText === 'si') {
    bot.sendMessage(chatId, '🔢 ¿Cuántas maniobras necesita?', {
      parse_mode: 'Markdown',
      reply_markup: { remove_keyboard: true }
    });
    userStates[userId].step = 'awaiting_maniobras_quantity';
  } else if (normalizedText === 'cancelar' || normalizedText === 'no') {
    delete userStates[userId];
    sendMainMenu(chatId);
  } else {
    bot.sendMessage(chatId, 'Por favor, selecciona una opción válida.', { 
      parse_mode: 'Markdown' 
    });
  }
}

function handleManiobrasQuantity(text, chatId, state) {
  const quantity = parseInt(text);
  if (isNaN(quantity) || quantity <= 0) {
    bot.sendMessage(chatId, '❌ *Por favor, ingresa un número válido de maniobras.*', {
      parse_mode: 'Markdown'
    });
    return;
  }
  state.data.quantity = quantity;
  state.step = 'awaiting_maniobras_description';
  bot.sendMessage(chatId, '✏️ Indícame por favor qué maniobras estará realizando.', {
    parse_mode: 'Markdown'
  });
}

function handleManiobrasDescription(text, chatId, state, userId, from) {
  const description = text.trim();
  if (description.length === 0) {
    bot.sendMessage(chatId, '❌ *Por favor, ingresa una descripción válida.*', {
      parse_mode: 'Markdown'
    });
    return;
  }
  const alertText = `⚠️⚠️ Cabina, se requieren ${state.data.quantity} maniobras. Se realizará: ${description}. Quedo al pendiente de la autorización. ¡Gracias! 🔧`;
  alertTypes.Maniobras.message = alertText;
  startAlert(userId, 'Maniobras', chatId, getUserName(from));
  delete userStates[userId];
  sendMainMenu(chatId);
}

// 6. GESTIÓN DE ALERTAS
function startAlert(userId, alertType, chatId, userName) {
  try {
    const alertInfo = alertTypes[alertType];
    if (!alertInfo) return;

    if (!activeAlerts[chatId]) activeAlerts[chatId] = {};
    if (!activeAlerts[chatId][userId]) activeAlerts[chatId][userId] = {};

    // Si existe una alerta previa del mismo tipo, se limpia
    if (activeAlerts[chatId][userId][alertType]?.interval) {
      clearInterval(activeAlerts[chatId][userId][alertType].interval);
      delete activeAlerts[chatId][userId][alertType];
    }

    // Evitar duplicados
    if (activeAlerts[chatId][userId][alertType]) {
      return;
    }

    // Validar límite de alertas (máximo 2 por usuario)
    const userAlerts = activeAlerts[chatId][userId];
    const alertCount = Object.keys(userAlerts).length;
    if (alertCount >= 2) {
      bot.sendMessage(chatId, '🚫 *Ya tienes el máximo de dos alertas activas.*', {
        parse_mode: 'Markdown'
      });
      return;
    }

    // Validar que no exista la misma alerta en el chat (para cualquier operador)
    const hasAlertOfSameType = Object.keys(activeAlerts[chatId]).some(uid => 
      Object.keys(activeAlerts[chatId][uid]).includes(alertType)
    );

    if (hasAlertOfSameType) {
      bot.sendMessage(chatId, `🚫 *Ya existe una alerta activa de ${alertType}.*`, {
        parse_mode: 'Markdown'
      });
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
    bot.sendMessage(chatId, '❌ *Error al iniciar alerta*\n_Por favor, intente nuevamente._', {
      parse_mode: 'Markdown'
    }).catch(() => {});
  }
}

function stopAlertForUser(chatId, targetUserId, alertType) {
  try {
    if (activeAlerts[chatId]?.[targetUserId]?.[alertType]) {
      if (activeAlerts[chatId][targetUserId][alertType].interval) {
        clearInterval(activeAlerts[chatId][targetUserId][alertType].interval);
      }
      delete activeAlerts[chatId][targetUserId][alertType];
    }
  } catch (error) {
    console.error(`Error en stopAlertForUser para ${chatId}/${targetUserId}/${alertType}:`, error);
  }
}

function cancelAllAlertsForChat(chatId) {
  try {
    // 1. Limpiar alertas normales
    if (activeAlerts[chatId]) {
      for (const userId in activeAlerts[chatId]) {
        for (const alertType in activeAlerts[chatId][userId]) {
          const alert = activeAlerts[chatId][userId][alertType];
          if (alert && alert.interval) {
            clearInterval(alert.interval);
          }
        }
      }
      delete activeAlerts[chatId];
    }

    // 2. Limpiar estados de usuario
    for (const userId in userStates) {
      if (userStates[userId] && userStates[userId].chatId === chatId) {
        delete userStates[userId];
      }
    }

    return true;
  } catch (error) {
    console.error('Error en cancelAllAlertsForChat:', error);
    return false;
  }
}

// 7. MANEJO DE ERRORES
bot.on('polling_error', (error) => {
  console.error('❌ Error de polling:', error);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Excepción no capturada:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Rechazo de promesa no manejado:', reason);
  process.exit(1);
});

// 8. CONFIGURACIÓN DEL SERVIDOR
app.post(webhookPath, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Bot funcionando en el puerto ${port}`);
});