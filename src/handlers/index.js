const setupCommandHandlers = require('./commands');
const { setupMessageHandlers, sendMainMenu, sendApoyoMenu } = require('./messages');
const { setupCallbackQueryHandlers } = require('./callback_query'); // Import the new handler

function setupHandlers(bot) {
  console.log('🔄 Iniciando configuración de handlers...');
  
  setupCommandHandlers(bot);
  console.log('✅ Handlers de comandos configurados');
  
  setupMessageHandlers(bot); // Still needed for non-button messages and maniobras input
  console.log('✅ Handlers de mensajes configurados');

  setupCallbackQueryHandlers(bot); // Register the new callback handler
  console.log('✅ Handlers de callback_query configurados');
}

module.exports = {
  setupHandlers,
  sendMainMenu, // Keep exporting these as they might be used elsewhere
  sendApoyoMenu
};
