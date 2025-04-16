const setupCommandHandlers = require('./commands');
const { setupMessageHandlers, sendMainMenu, sendApoyoMenu } = require('./messages');

function setupHandlers(bot) {
  console.log('🔄 Iniciando configuración de handlers...');
  setupCommandHandlers(bot);
  console.log('✅ Handlers de comandos configurados');
  setupMessageHandlers(bot);
  console.log('✅ Handlers de mensajes configurados');
}

module.exports = {
  setupHandlers,
  sendMainMenu,
  sendApoyoMenu
};