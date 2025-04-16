const { Maniobra, Group } = require('../models');
const { sendMainMenu } = require('./messages');
const { isAlertManager, isSuperAdmin } = require('../utils/permissions');
const { cancelAllAlertsForChat } = require('../services/alert');
const { clearUserStates } = require('../services/maniobra');

function setupCommandHandlers(bot) {
  // Comando /start
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    sendMainMenu(bot, chatId);
  });

  // Comando /cancelar_alertas
  bot.onText(/\/cancelar_alertas/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!isSuperAdmin(userId)) {
      await bot.sendMessage(chatId, '⛔ *No tienes permisos para ejecutar este comando.*', { 
        parse_mode: 'Markdown' 
      });
      return;
    }
    
    const success = cancelAllAlertsForChat(chatId);
    clearUserStates(chatId);
    
    if (success) {
      await bot.sendMessage(chatId, '🔔 *Todas las alertas y procesos han sido cancelados por el Administrador.*', {
        parse_mode: 'Markdown'
      });
      setTimeout(() => sendMainMenu(bot, chatId), 500);
    } else {
      await bot.sendMessage(chatId, '❌ *Error al cancelar las alertas. Por favor, intente de nuevo.*', {
        parse_mode: 'Markdown'
      });
    }
  });

  // Comando /restart
  bot.onText(/\/restart/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!isSuperAdmin(userId)) {
      await bot.sendMessage(chatId, '⛔ *No tienes permisos para ejecutar este comando.*', { 
        parse_mode: 'Markdown' 
      });
      return;
    }
    
    await bot.sendMessage(chatId, '🔄 *Reiniciando el servidor...*', { 
      parse_mode: 'Markdown' 
    });
    setTimeout(() => process.exit(1), 2000);
  });

  // Comando /report
  bot.onText(/\/report/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!isAlertManager(userId)) {
      return bot.sendMessage(chatId, '⛔ Solo los Alert Manager pueden ver el reporte.', { 
        parse_mode: 'Markdown' 
      });
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
        return bot.sendMessage(chatId, '*No hay maniobras registradas esta semana.*', { 
          parse_mode: 'Markdown' 
        });
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
                        `🏢 *Grupo:* ${data.groupName}\n`;

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
      bot.sendMessage(chatId, '❌ *Error al generar reporte. Por favor, intenta nuevamente.*', { 
        parse_mode: 'Markdown' 
      });
    }
  });
}

module.exports = setupCommandHandlers;
