// Cargar variables de entorno
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import bodyParser from 'body-parser';
import TelegramBot from 'node-telegram-bot-api';
import { Low, JSONFile } from 'lowdb';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar Lowdb
const dbFile = path.join(__dirname, 'db.json');
const adapter = new JSONFile(dbFile);
const db = new Low(adapter);

// Inicializar la base de datos
async function initDB() {
  await db.read();
  db.data = db.data || { activeAlerts: {}, globalActiveAlerts: {}, userStates: {} };
  await db.write();
}

initDB();

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
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // Inicializar el estado del usuario en la base de datos
  db.data.userStates[userId] = { chatId, step: null, data: {} };
  await db.write();

  sendMainMenu(chatId);
});

// Manejar mensajes y acciones
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text ? msg.text.trim() : '';
  const from = msg.from;

  // Ignorar mensajes de bots y el comando /start
  if (msg.from.is_bot || text === '/start') return;

  // Leer la base de datos
  await db.read();

  // Manejar estados de conversación (e.g., Maniobras)
  if (db.data.userStates[userId] && db.data.userStates[userId].chatId === chatId) {
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
async function handleOperatorAction(alertType, chatId, userId, from) {
  switch (alertType) {
    case 'Conferencia':
    case 'USUARIO_NO_ESTA_EN_VH':
    case 'VALIDACION_DE_ORIGEN':
      await startAlert(userId, alertType, chatId, getUserName(from));
      break;
    case 'Maniobras':
      // Confirmación antes de proceder
      await bot.sendMessage(chatId, '🛠️ *Estás iniciando el proceso de solicitud de maniobras, ¿deseas CONTINUAR?*', {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [['✅ Continuar', '❌ Cancelar']],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      });
      db.data.userStates[userId] = { chatId, step: 'confirming_maniobras', data: {} };
      await db.write();
      break;
    default:
      // Acción desconocida, no hacer nada
      return;
  }
}

// Función para manejar acciones de alertManagerIds (TR y HORA_DE_ESPERA)
async function handleAlertManagerAction(alertType, chatId, userId, from) {
  const chatAlerts = db.data.globalActiveAlerts[chatId] || {};
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
      await bot.sendMessage(chatId, '⏰⏰ Se ha iniciado el contador de 20 minutos para TIEMPO REGLAMENTARIO. ⏳ Se enviarán recordatorios al grupo.', { parse_mode: 'Markdown' });
      // Iniciar alerta de TR
      chatAlerts['TR'] = {
        active: true,
        userId: userId,
        userName: getUserName(from)
      };
      db.data.globalActiveAlerts[chatId] = chatAlerts;
      await db.write();
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
      await bot.sendMessage(chatId, '⏰⏰ Se ha iniciado el contador de 60 minutos para la HORA DE ESPERA. ⏳ Se enviarán recordatorios al grupo.', { parse_mode: 'Markdown' });
      // Iniciar alerta de HORA_DE_ESPERA
      chatAlerts['HORA_DE_ESPERA'] = {
        active: true,
        userId: userId,
        userName: getUserName(from)
      };
      db.data.globalActiveAlerts[chatId] = chatAlerts;
      await db.write();
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
async function handleAlertManagerDeactivation(alertType, chatId, userId, from) {
  let alertFound = false;
  if (alertType === 'TR' || alertType === 'HORA_DE_ESPERA') {
    const chatAlerts = db.data.globalActiveAlerts[chatId] || {};
    if (chatAlerts[alertType]) {
      delete chatAlerts[alertType];
      db.data.globalActiveAlerts[chatId] = chatAlerts;
      const message = cancelationMessages[alertType] || `🆗🆗 **ALERTA DE ${alertType.replace(/_/g, ' ')} CANCELADA.**`;
      // Enviar mensaje de cancelación al grupo
      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      alertFound = true;
      await db.write();
    }
  } else {
    // Desactivar la alerta si fue activada por un operatorId
    const chatOperatorsAlerts = db.data.activeAlerts[chatId] || {};
    for (const operatorId of operatorIds) {
      if (chatOperatorsAlerts[operatorId] && chatOperatorsAlerts[operatorId][alertType]) {
        await stopAlertForUser(chatId, operatorId, alertType);
        const message = cancelationMessages[alertType] || `🆗🆗 **ALERTA DE ${alertType.replace(/_/g, ' ')} CANCELADA.**`;
        // Enviar mensaje de cancelación al grupo
        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        alertFound = true;
        await db.write();
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
async function handleUserState(userId, text, chatId, from) {
  const state = db.data.userStates[userId];
  if (state.chatId !== chatId) {
    // Ignorar mensajes de otros chats
    return;
  }
  const normalizedText = normalizeText(text);
  switch (state.step) {
    case 'confirming_maniobras':
      if (normalizedText === 'continuar' || normalizedText === 'si') {
        await bot.sendMessage(chatId, '🔢 ¿Cuántas maniobras necesita?', {
          parse_mode: 'Markdown',
          reply_markup: {
            remove_keyboard: true
          }
        });
        state.step = 'awaiting_maniobras_quantity';
        await db.write();
      } else if (normalizedText === 'cancelar' || normalizedText === 'no') {
        // Cancelar y regresar al menú principal
        delete db.data.userStates[userId];
        await db.write();
        sendMainMenu(chatId);
      } else {
        await bot.sendMessage(chatId, 'Por favor, selecciona una opción válida.', { parse_mode: 'Markdown' });
      }
      break;
    case 'awaiting_maniobras_quantity':
      const quantity = parseInt(text);
      if (isNaN(quantity) || quantity <= 0) {
        await bot.sendMessage(chatId, '❌ *Por favor, ingresa un número válido de maniobras.*', { parse_mode: 'Markdown' });
        return;
      }
      state.data.quantity = quantity;
      state.step = 'awaiting_maniobras_description';
      await db.write();
      await bot.sendMessage(chatId, '✏️ Indícame por favor qué maniobras estará realizando.', { parse_mode: 'Markdown' });
      break;
    case 'awaiting_maniobras_description':
      const description = text.trim();
      if (description.length === 0) {
        await bot.sendMessage(chatId, '❌ *Por favor, ingresa una descripción válida.*', { parse_mode: 'Markdown' });
        return;
      }
      const alertText = `⚠️⚠️ Cabina, se requieren ${state.data.quantity} maniobras. Se realizará: ${description}. Quedo al pendiente de la autorización. ¡Gracias! 🔧`;
      alertTypes.Maniobras.message = alertText; // Actualizar el mensaje de la alerta MANIOBRAS
      await startAlert(userId, 'Maniobras', chatId, getUserName(from));
      delete db.data.userStates[userId];
      await db.write();
      // Regresar al menú principal
      sendMainMenu(chatId);
      break;
    default:
      delete db.data.userStates[userId];
      await db.write();
      // Estado desconocido, no hacer nada
      return;
  }
}

// Función para iniciar una alerta
async function startAlert(userId, alertType, chatId, userName) {
  const alertInfo = alertTypes[alertType];
  if (!alertInfo) {
    // Tipo de alerta desconocido, no hacer nada
    return;
  }

  if (!db.data.activeAlerts[chatId]) {
    db.data.activeAlerts[chatId] = {};
  }
  if (!db.data.activeAlerts[chatId][userId]) {
    db.data.activeAlerts[chatId][userId] = {};
  }

  // Verificar si la alerta ya está activa
  if (db.data.activeAlerts[chatId][userId][alertType]) {
    // Ya existe una alerta de este tipo, no hacer nada
    return;
  }

  // Implementar la regla de máximo dos alertas activas por usuario, excluyendo TR y HORA_DE_ESPERA
  const userAlerts = db.data.activeAlerts[chatId][userId];
  const alertCount = Object.keys(userAlerts).filter(type => type !== 'TR' && type !== 'HORA_DE_ESPERA').length;
  if (alertCount >= 2) {
    // Máximo de dos alertas activas alcanzado, enviar mensaje al usuario
    await bot.sendMessage(chatId, '🚫 *Ya tienes el máximo de dos alertas activas.*', { parse_mode: 'Markdown' });
    return;
  }

  const message = alertInfo.message;

  // Enviar la primera alerta inmediatamente al chat
  await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' }).catch(() => {});

  // Guardar la alerta con su tipo y nombre de usuario
  db.data.activeAlerts[chatId][userId][alertType] = {
    interval: setInterval(async () => {
      await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' }).catch(() => {});
    }, 20000), // Intervalo fijo de 20 segundos
    message: message,
    userName: userName
  };
  await db.write();
}

// Función para manejar alertas programadas para TR y HORA_DE_ESPERA
function manageTimedAlertGlobal(chatId, alertType, message, delay) {
  setTimeout(async () => {
    await db.read(); // Leer la última actualización
    const chatAlerts = db.data.globalActiveAlerts[chatId] || {};
    // Verificar si la alerta global no ha sido detenida
    if (chatAlerts[alertType] && chatAlerts[alertType].active) {
      await bot.sendMessage(chatId, `${message}`, { parse_mode: 'Markdown' }).catch(() => {});
      // Si este es el mensaje final, desactivar la alerta
      if (message.includes('ha finalizado')) {
        delete chatAlerts[alertType];
        db.data.globalActiveAlerts[chatId] = chatAlerts;
        await db.write();
      }
    }
  }, delay);
}

// Función para detener una alerta específica para un usuario
async function stopAlertForUser(chatId, targetUserId, alertType) {
  if (db.data.activeAlerts[chatId] && db.data.activeAlerts[chatId][targetUserId] && db.data.activeAlerts[chatId][targetUserId][alertType]) {
    // Si es una alerta con intervalos
    if (db.data.activeAlerts[chatId][targetUserId][alertType].interval) {
      clearInterval(db.data.activeAlerts[chatId][targetUserId][alertType].interval);
    }
    // Eliminar la alerta
    delete db.data.activeAlerts[chatId][targetUserId][alertType];
    await db.write();
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
