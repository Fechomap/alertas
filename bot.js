/*****************************************
 * 1. CONFIGURACIÓN INICIAL Y DEPENDENCIAS *
 *****************************************/
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');

// Variables de entorno
const token = process.env.TELEGRAM_BOT_TOKEN;
const url = process.env.HEROKU_APP_URL || 'https://tu-app-en-heroku.herokuapp.com';
const environment = process.env.NODE_ENV || 'development';

/********************************
 * 2. INICIALIZACIÓN DEL BOT    *
 ********************************/
let bot;
if (environment === 'development') {
  bot = new TelegramBot(token, { polling: true });
  console.log('⚙️ Bot iniciado en modo POLLING (desarrollo)');
} else {
  bot = new TelegramBot(token, { webHook: true });
  const webhookPath = `/bot${token}`;
  bot.setWebHook(`${url}${webhookPath}`);
  console.log('⚙️ Bot iniciado en modo WEBHOOK (producción)');
}

/*********************************
 * 3. ESTRUCTURAS DE DATOS       *
 *********************************/
// Estados y alertas
const activeAlerts = {};    
const userStates = {};      

// IDs de usuarios autorizados
const operatorIds = [7143094298, 7754458578, 7509818905, 8048487029];
const alertManagerIds = [7143094298, 1022124142, 7758965062, 5660087041, 6330970125];
const SUPER_ADMIN_ID = 7143094298;

// Tipos de alertas y mensajes
const alertTypes = {
  Conferencia: {
    message: '⚠️⚠️ Cabina, por favor apóyame con una conferencia. ¡Gracias! 📞'
  },
  USUARIO_NO_ESTA_EN_VH: {
    message: '⚠️⚠️ Cabina, por favor apóyame avisando al usuario que salga. ¡Gracias! 🚗'
  },
  VALIDACION_DE_ORIGEN: {
    message: '⚠️⚠️ Cabina, por favor apóyame con la validación del origen. ¡Gracias! 📍'
  }
};

const buttonActions = {
  '🤝 APOYO': 'APOYO',
  '🚗 MANIOBRAS': 'Maniobras',
  '📞 CONFERENCIA': 'Conferencia',
  '🚫 NA NO ESTA EN VH': 'USUARIO_NO_ESTA_EN_VH',
  '🔍 VALIDAR ORIGEN': 'VALIDACION_DE_ORIGEN'
};

const cancelationMessages = {
  'Conferencia': '🆗🆗 *CONFERENCIA* atendida. 📞 Enseguida le llaman. Alerta desactivada. ¡Gracias! ✔️',
  'USUARIO_NO_ESTA_EN_VH': '🆗🆗 Se está gestionando el contacto con el usuario para que salga. 📞 Alerta desactivada. ¡Gracias! ✔️',
  'VALIDACION_DE_ORIGEN': '🆗🆗 Se está gestionando el contacto con el usuario para verificar su ubicación. 📞 Alerta desactivada. ¡Gracias! ✔️'
};

/*********************************
 * 4. CONFIGURACIÓN DE MONGODB    *
 *********************************/
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ Conectado a MongoDB');
}).catch(err => {
  console.error('❌ Error al conectar a MongoDB:', err);
});

const maniobraSchema = new mongoose.Schema({
  chatId: { type: String, required: true },
  groupName: { type: String, required: true },
  alertManagerId: { type: Number, required: true },
  maniobras: { type: Number, required: true, min: 1, max: 10 },
  descripcion: { type: String, required: true },
  fecha: { type: Date, default: Date.now }
});

const Maniobra = mongoose.model('Maniobra', maniobraSchema);

// Agregar después del maniobraSchema
const groupSchema = new mongoose.Schema({
  chatId: { type: String, required: true, unique: true },
  displayName: { type: String, required: true }
});

const Group = mongoose.model('Group', groupSchema);

/*********************************
 * 5. FUNCIONES DE UTILIDAD      *
 *********************************/
function isOperator(userId) {
  return operatorIds.includes(userId);
}

function isAlertManager(userId) {
  return alertManagerIds.includes(userId);
}

function isSuperAdmin(userId) {
  return userId === SUPER_ADMIN_ID;
}

function getUserName(user) {
  const firstName = user.first_name || '';
  const lastName = user.last_name || '';
  return `${firstName} ${lastName}`.trim();
}

function normalizeText(text) {
  return text.replace(/[^\p{L}\p{N}\s]/gu, '').trim().toLowerCase();
}

/*********************************
 * 6. FUNCIONES DE INTERFAZ      *
 *********************************/
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

/*********************************
 * 7. MANEJO DE MANIOBRAS       *
 *********************************/
function startManiobrasFlow(chatId, userId) {
  if (!isAlertManager(userId)) {
    bot.sendMessage(chatId, '⛔ *Solo los Alert Manager pueden registrar maniobras.*', {
      parse_mode: 'Markdown'
    });
    return;
  }

  if (mongoose.connection.readyState !== 1) {
    bot.sendMessage(chatId, '❌ *Error de conexión con la base de datos. Por favor, intente más tarde.*', {
      parse_mode: 'Markdown'
    });
    return;
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
}

async function handleManiobrasState(userId, text, chatId) {
  const state = userStates[userId];
  if (!state || state.chatId !== chatId) return;

  try {
    switch (state.step) {
      case 'awaiting_maniobras_quantity':
        const quantity = parseInt(text);
        if (isNaN(quantity) || quantity < 1 || quantity > 10) {
          bot.sendMessage(chatId, '❌ *Por favor, ingresa un número válido entre 1 y 10.*', {
            parse_mode: 'Markdown'
          });
          return;
        }

        state.data.quantity = quantity;
        state.step = 'confirming_maniobras';

        bot.sendMessage(chatId, 
          `*¿Confirmas el registro de ${quantity} maniobras?*\n\n` +
          `Presiona: ✅ Confirmar o ❌ Cancelar`, {
          parse_mode: 'Markdown',
          reply_markup: {
            keyboard: [['✅ Confirmar', '❌ Cancelar']],
            resize_keyboard: true,
            one_time_keyboard: true
          }
        });
        break;

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
          setTimeout(() => sendMainMenu(chatId), 1000);
        } else if (text === '❌ Cancelar') {
          bot.sendMessage(chatId, '❌ *Registro de maniobras cancelado.*', {
            parse_mode: 'Markdown'
          });
          delete userStates[userId];
          setTimeout(() => sendMainMenu(chatId), 1000);
        }
        break;
    }
  } catch (error) {
    console.error('Error en handleManiobrasState:', error);
    bot.sendMessage(chatId, '❌ *Ocurrió un error al procesar tu solicitud. Por favor, intenta nuevamente.*', {
      parse_mode: 'Markdown'
    });
    delete userStates[userId];
    setTimeout(() => sendMainMenu(chatId), 1000);
  }
}
/*********************************
 * 8. MANEJO DE ALERTAS         *
 *********************************/
function startAlert(userId, alertType, chatId, userName) {
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
    }
  } catch (error) {
    console.error(`Error en stopAlertForUser para ${chatId}/${targetUserId}/${alertType}:`, error);
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
    
    for (const userId in userStates) {
      if (userStates[userId]?.chatId === chatId) {
        delete userStates[userId];
      }
    }
    return true;
  } catch (error) {
    console.error('Error en cancelAllAlertsForChat:', error);
    return false;
  }
}

function handleOperatorAction(alertType, chatId, userId, from) {
  switch (alertType) {
    case 'Conferencia':
    case 'USUARIO_NO_ESTA_EN_VH':
    case 'VALIDACION_DE_ORIGEN':
      startAlert(userId, alertType, chatId, getUserName(from));
      break;
    default:
      break;
  }
}

function handleAlertManagerDeactivation(alertType, chatId, userId) {
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
  } catch (error) {
    console.error(`Error en handleAlertManagerDeactivation para ${chatId}/${alertType}:`, error);
  }
}

/*********************************
 * 9. MANEJADORES DE COMANDOS    *
 *********************************/
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  sendMainMenu(chatId);
});

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
    await bot.sendMessage(chatId, '⛔ *No tienes permisos para ejecutar este comando.*', { parse_mode: 'Markdown' });
  }
});

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

bot.onText(/\/report/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!isAlertManager(userId)) {
    return bot.sendMessage(chatId, '⛔ Solo los Alert Manager pueden ver el reporte.', { parse_mode: 'Markdown' });
  }
  
  try {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    // Obtener maniobras y grupos
    const [maniobras, groups] = await Promise.all([
      Maniobra.find({
        fecha: { $gte: monday, $lte: sunday }
      }).sort({ fecha: 1 }),
      Group.find()
    ]);

    if (!maniobras.length) {
      return bot.sendMessage(chatId, '*No hay maniobras registradas esta semana.*', { parse_mode: 'Markdown' });
    }

    // Crear mapeo de nombres de grupos
    const groupNames = groups.reduce((acc, group) => {
      acc[group.chatId] = group.displayName;
      return acc;
    }, {});

    // Agrupar maniobras por grupo
    const maniobrasPorGrupo = maniobras.reduce((acc, m) => {
      const displayName = groupNames[m.chatId] || m.groupName;
      if (!acc[m.chatId]) {
        acc[m.chatId] = {
          groupName: displayName,
          maniobras: [],
          total: 0
        };
      }
      acc[m.chatId].maniobras.push({
        fecha: m.fecha,
        cantidad: m.maniobras
      });
      acc[m.chatId].total += m.maniobras;
      return acc;
    }, {});

    // Generar un reporte para cada grupo
    for (const [groupId, data] of Object.entries(maniobrasPorGrupo)) {
      let reportText = `*📊 Reporte de Maniobras*\n` +
                      `*Semana del ${monday.toLocaleDateString()} al ${sunday.toLocaleDateString()}*\n\n` +
                      `🏢 *Grupo:* ${data.groupName}\n`; // Aquí usamos el nombre personalizado

      // Ordenar maniobras por fecha
      data.maniobras.sort((a, b) => a.fecha - b.fecha);
      
      // Agregar cada maniobra con hora
      data.maniobras.forEach(m => {
        reportText += `📅 *Fecha:* ${m.fecha.toLocaleDateString()} ${m.fecha.toLocaleTimeString().slice(0,5)} 🔢 *Maniobras:* ${m.cantidad}\n`;
      });

      // Agregar total
      reportText += `\n📝 *Total maniobras:* ${data.total}`;

      // Enviar reporte individual para cada grupo
      await bot.sendMessage(chatId, reportText, { parse_mode: 'Markdown' });
    }
  } catch (error) {
    console.error('Error en /report:', error);
    bot.sendMessage(chatId, '❌ *Error al generar reporte. Por favor, intenta nuevamente.*', { parse_mode: 'Markdown' });
  }
});

/*********************************
 * 10. MANEJADOR PRINCIPAL       *
 *********************************/
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text ? msg.text.trim() : '';
  const from = msg.from;

  // Agregar esta verificación al inicio
  if (text === '🔙 Regresar') {
    sendMainMenu(chatId);
    return;
  }

  if (userStates[userId] && userStates[userId].chatId === chatId) {
    handleManiobrasState(userId, text, chatId);
    return;
  }

  if (buttonActions[text]) {
    const action = buttonActions[text];

    if (action === 'APOYO') {
      sendApoyoMenu(chatId);
      return;
    }

    if (action === 'Maniobras') {
      if (!isAlertManager(userId)) {
        bot.sendMessage(chatId, '⛔ *Solo los Alert Manager pueden registrar maniobras.*', { parse_mode: 'Markdown' });
        return;
      }
      startManiobrasFlow(chatId, userId);
      return;
    }

    if (isOperator(userId)) {
      handleOperatorAction(action, chatId, userId, from);
    } else if (isAlertManager(userId)) {
      handleAlertManagerDeactivation(action, chatId, userId);
    }
  }
});

/*********************************
 * 11. MANEJO DE ERRORES        *
 *********************************/
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

/*****************************************
 * 12. CONFIGURACIÓN DEL SERVIDOR EXPRESS *
 *****************************************/
const app = express();
app.use(bodyParser.json());

// Configuración de webhook para producción
const webhookPath = `/bot${token}`;
app.post(webhookPath, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Iniciar servidor
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ Bot funcionando en el puerto ${port} [${environment}]`);
  console.log('🤖 Bot listo para recibir mensajes');
});