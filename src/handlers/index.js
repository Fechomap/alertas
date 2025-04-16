const setupCommandHandlers = require('./commands');
const { setupMessageHandlers, sendMainMenu, sendApoyoMenu } = require('./messages');

function setupHandlers(bot) {
  setupCommandHandlers(bot);
  setupMessageHandlers(bot);
}

module.exports = {
  setupHandlers,
  sendMainMenu,
  sendApoyoMenu
};
