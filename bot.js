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
const url = process.env.HEROKU_APP_URL || 'https://chubb-bot-0dd0033c99dc.herokuapp.com';

// 1.4 Configuración del Bot y Webhook
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
const globalActiveAlerts = {};  // Para alertas TR y HORA_DE_ESPERA por chat
const userStates = {};      // Estructura: { userId: { chatId, step, data } }

// 2.3 Definición de tipos de alertas.
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
    message: '' // HORA_DE_ESPERA tiene alertas programadas.
  },
  VALIDACION_DE_ORIGEN: {
    message: '⚠️⚠️ Cabina, por favor apóyame con la validación del origen. ¡Gracias! 📍'
  }
};

// 2.4 Mensajes de cancelación
const cancelationMessages = {
  'Conferencia': '🆗🆗 *CONFERENCIA* atendida. 📞 Enseguida le llaman. Alerta desactivada. ¡Gracias! ✔️',
  'Maniobras': '🆗🆗 *MANIOBRAS* atendidas. 🔧 En breve se notificará quién las cubre. Alerta desactivada. ¡Gracias! ✔️',
  'USUARIO_NO_ESTA_EN_VH': '🆗🆗 Se está gestionando el contacto con el usuario para que salga. 📞 Alerta desactivada. ¡Gracias! ✔️',
  'VALIDACION_DE_ORIGEN': '🆗🆗 Se está gestionando el contacto con el usuario para verificar su ubicación. 📞 Alerta desactivada. ¡Gracias! ✔️',
  'TR': '🛎️🛎️ *TIEMPO REGLAMENTARIO* completado con éxito. Alerta desactivada. ¡Gracias! ✔️',
  'HORA_DE_ESPERA': '🛎️🛎️ *HORA DE ESPERA* completada con éxito. Alerta desactivada. ¡Gracias! ✔️'
};

// 2.5 Mapeo de botones a acciones
const buttonActions = {
  '📞 CONFERENCIA': 'Conferencia',
  '🚗 MANIOBRAS': 'Maniobras',
  '🚫 NA NO ESTA EN VH': 'USUARIO_NO_ESTA_EN_VH',
  '🔍 VALIDAR ORIGEN': 'VALIDACION_DE_ORIGEN',
  '🕒 TR': 'TR',
  '⏳ HR': 'HORA_DE_ESPERA'
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

  bot.sendMessage(chatId, 'Menú principal:', {
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

  // 4.2.2 Manejo de estados de conversación
  if (userStates[userId] && userStates[userId].chatId === chatId) {
    handleUserState(userId, text, chatId, from);
    return;
  }

  // 4.2.3 Procesamiento de acciones de botones
  if (buttonActions[text]) {
    const alertType = buttonActions[text];
    const isOperatorUser = isOperator(userId);
    const isAlertManagerUser = isAlertManager(userId);

    // 4.2.4 Manejo de alertas especiales (TR y HORA_DE_ESPERA)
    if (alertType === 'TR' || alertType === 'HORA_DE_ESPERA') {
      if (isAlertManagerUser) {
        handleAlertManagerAction(alertType, chatId, userId, from);
      }
      return;
    }

    // 4.2.5 Manejo de otras alertas
    if (isOperatorUser) {
      handleOperatorAction(alertType, chatId, userId, from);
    } else if (isAlertManagerUser) {
      handleAlertManagerDeactivation(alertType, chatId, userId, from);
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

// 4.4 Manejador de acciones de managers de alertas
function handleAlertManagerAction(alertType, chatId, userId, from) {
  const chatAlerts = globalActiveAlerts[chatId] || {};
  
  switch (alertType) {
    case 'TR':
      if (!chatAlerts['TR'] && !chatAlerts['HORA_DE_ESPERA']) {
        bot.sendMessage(chatId, '⏰⏰ Se ha iniciado el contador de 20 minutos para TIEMPO REGLAMENTARIO. ⏳ Se enviarán recordatorios al grupo.', { parse_mode: 'Markdown' });
        chatAlerts['TR'] = {
          active: true,
          userId: userId,
          userName: getUserName(from)
        };
        globalActiveAlerts[chatId] = chatAlerts;
        manageTimedAlertGlobal(chatId, 'TR', '⏳⏳ **TIEMPO REGLAMENTARIO:** Estamos a la mitad del tiempo. 🔔 Si es posible, realiza una conferencia de nuevo.', 600000);
        manageTimedAlertGlobal(chatId, 'TR', '⏳⏳ **TIEMPO REGLAMENTARIO:** El tiempo ha finalizado. ✅', 1200000);
      }
      break;
    case 'HORA_DE_ESPERA':
      if (!chatAlerts['HORA_DE_ESPERA'] && !chatAlerts['TR']) {
        bot.sendMessage(chatId, '⏰⏰ Se ha iniciado el contador de 60 minutos para la HORA DE ESPERA. ⏳ Se enviarán recordatorios al grupo.', { parse_mode: 'Markdown' });
        chatAlerts['HORA_DE_ESPERA'] = {
          active: true,
          userId: userId,
          userName: getUserName(from)
        };
        globalActiveAlerts[chatId] = chatAlerts;
        manageTimedAlertGlobal(chatId, 'HORA_DE_ESPERA', '⏳⏳ **HORA DE ESPERA:** Quedan 15 minutos para que finalice. 🔔 Si es posible, realiza una conferencia de nuevo.', 2700000);
        manageTimedAlertGlobal(chatId, 'HORA_DE_ESPERA', '⏳⏳ **HORA DE ESPERA:** El tiempo ha finalizado. ✅', 3600000);
      }
      break;
  }
}

// 4.5 Manejador del comando cancelar_alertas
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

// 5. MANEJO DE ESTADOS DE CONVERSACIÓN
// 5.1 Manejador principal de estados de usuario
function handleUserState(userId, text, chatId, from) {
  const state = userStates[userId];
  if (state.chatId !== chatId) return;
  
  const normalizedText = normalizeText(text);

  // 5.1.1 Máquina de estados para el flujo de conversación
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

// 5.2 Manejadores específicos de estados de maniobras
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
// 6.1 Iniciador de alertas
function startAlert(userId, alertType, chatId, userName) {
  try {
    const alertInfo = alertTypes[alertType];
    if (!alertInfo) return;

    // Inicialización de estructuras
    if (!activeAlerts[chatId]) activeAlerts[chatId] = {};
    if (!activeAlerts[chatId][userId]) activeAlerts[chatId][userId] = {};

    // Verificar y limpiar alertas huérfanas primero
    if (activeAlerts[chatId][userId][alertType]?.interval) {
      clearInterval(activeAlerts[chatId][userId][alertType].interval);
      delete activeAlerts[chatId][userId][alertType];
    }

    // Validación de alerta existente del mismo tipo
    if (activeAlerts[chatId][userId][alertType]) {
      return; // Ya existe esta alerta para este usuario
    }

    // Validación del límite de alertas (2 máximo)
    const userAlerts = activeAlerts[chatId][userId];
    const alertCount = Object.keys(userAlerts)
      .filter(type => type !== 'TR' && type !== 'HORA_DE_ESPERA')
      .length;
      
    if (alertCount >= 2) {
      bot.sendMessage(chatId, '🚫 *Ya tienes el máximo de dos alertas activas.*', {
        parse_mode: 'Markdown'
      });
      return;
    }

    // Validación de alerta del mismo tipo en el chat
    const hasAlertOfSameType = Object.keys(activeAlerts[chatId]).some(uid => 
      Object.keys(activeAlerts[chatId][uid]).includes(alertType)
    );

    if (hasAlertOfSameType) {
      bot.sendMessage(chatId, `🚫 *Ya existe una alerta activa de ${alertType}.*`, {
        parse_mode: 'Markdown'
      });
      return;
    }

    // Si pasa todas las validaciones, entonces creamos la alerta
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

// 6.2 Gestor de alertas programadas
function manageTimedAlertGlobal(chatId, alertType, message, delay) {
  try {
    if (!globalActiveAlerts[chatId]) globalActiveAlerts[chatId] = {};
    
    // Si ya existe una alerta de este tipo, la limpiamos
    if (globalActiveAlerts[chatId][alertType]?.timeoutId) {
      clearTimeout(globalActiveAlerts[chatId][alertType].timeoutId);
    }

    const timeoutId = setTimeout(() => {
      if (globalActiveAlerts[chatId]?.[alertType]?.active) {
        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
          .catch(error => console.error(`Error en alerta global: ${error}`));
          
        if (message.includes('ha finalizado')) {
          delete globalActiveAlerts[chatId][alertType];
        }
      }
    }, delay);

    // Guardamos el timeoutId para poder cancelarlo después
    if (!globalActiveAlerts[chatId][alertType]) {
      globalActiveAlerts[chatId][alertType] = {};
    }
    globalActiveAlerts[chatId][alertType].timeoutId = timeoutId;
  } catch (error) {
    console.error(`Error en manageTimedAlertGlobal para ${chatId}/${alertType}:`, error);
  }
}

// 6.3 Detenedor de alertas
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

// 6.4 Manejador de desactivación de alertas
function handleAlertManagerDeactivation(alertType, chatId, userId, from) {
  try {
    let alertFound = false;
    
    if (alertType === 'TR' || alertType === 'HORA_DE_ESPERA') {
      const chatAlerts = globalActiveAlerts[chatId] || {};
      if (chatAlerts[alertType]) {
        if (chatAlerts[alertType].timeoutId) {
          clearTimeout(chatAlerts[alertType].timeoutId);
        }
        delete chatAlerts[alertType];
        globalActiveAlerts[chatId] = chatAlerts;
        const message = cancelationMessages[alertType];
        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        alertFound = true;
      }
    } else {
      const chatOperatorsAlerts = activeAlerts[chatId] || {};
      for (const operatorId of operatorIds) {
        if (chatOperatorsAlerts[operatorId]?.[alertType]) {
          stopAlertForUser(chatId, operatorId, alertType);
          const message = cancelationMessages[alertType];
          bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
          alertFound = true;
          break;
        }
      }
    }
  } catch (error) {
    console.error(`Error en handleAlertManagerDeactivation para ${chatId}/${alertType}:`, error);
  }
}

// 6.5 Cancelación global de alertas
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

    // 2. Limpiar alertas globales
    if (globalActiveAlerts[chatId]) {
      for (const alertType in globalActiveAlerts[chatId]) {
        const alert = globalActiveAlerts[chatId][alertType];
        if (alert) {
          if (alert.timeoutId) {
            clearTimeout(alert.timeoutId);
          }
          if (alert.active) {
            alert.active = false;
          }
        }
      }
      delete globalActiveAlerts[chatId];
    }

    // 3. Limpiar estados de usuario
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

// 6.6 Comando de emergencia (Nuevo)
bot.onText(/\/emergencia/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (isSuperAdmin(userId) || isOperator(userId)) {
    try {
      // Forzar limpieza completa y reinicio
      const success = cancelAllAlertsForChat(chatId);
      
      if (success) {
        // Forzar limpieza adicional de variables globales
        for (const key in activeAlerts) {
          if (activeAlerts[key]) {
            delete activeAlerts[key];
          }
        }
        for (const key in globalActiveAlerts) {
          if (globalActiveAlerts[key]) {
            delete globalActiveAlerts[key];
          }
        }
        for (const key in userStates) {
          if (userStates[key]) {
            delete userStates[key];
          }
        }

        await bot.sendMessage(chatId, '🚨 *REINICIO DE EMERGENCIA COMPLETADO*\n_Se han eliminado todas las alertas y estados._', {
          parse_mode: 'Markdown'
        });
        setTimeout(() => sendMainMenu(chatId), 500);
      } else {
        throw new Error('Falló la limpieza de alertas');
      }
    } catch (error) {
      console.error('Error en comando de emergencia:', error);
      await bot.sendMessage(chatId, '❌ *Error en reinicio de emergencia*\n_Por favor, contacte al administrador._', {
        parse_mode: 'Markdown'
      });
    }
  } else {
    await bot.sendMessage(chatId, '⛔ *No tienes permisos para ejecutar este comando.*', {
      parse_mode: 'Markdown'
    });
  }
});

// 7. MANEJO DE ERRORES
// 7.1 Errores de Polling
bot.on('polling_error', (error) => {
  console.error('❌ Error de polling:', error);
});

// 7.2 Excepciones no capturadas
process.on('uncaughtException', (err) => {
  console.error('❌ Excepción no capturada:', err);
  // Salir del proceso para que Heroku lo reinicie si está en producción
  process.exit(1);
});

// 7.3 Promesas rechazadas no manejadas
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Rechazo de promesa no manejado:', reason);
  // Salir del proceso para que Heroku lo reinicie si está en producción
  process.exit(1);
});

// 8. CONFIGURACIÓN DEL SERVIDOR
// 8.1 Configuración del Webhook
app.post(webhookPath, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// 8.2 Inicialización del servidor Express
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Bot funcionando en el puerto ${port}`);
});