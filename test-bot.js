// test-bot.js
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

console.log('Bot iniciando...');

// Manejador básico para el comando /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, '¡Hola! El bot está funcionando.');
});

// Manejador de eco para probar respuestas
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    console.log('Mensaje recibido:', msg.text);
    if (msg.text !== '/start') {
        bot.sendMessage(chatId, `Recibí tu mensaje: ${msg.text}`);
    }
});

// Manejador de errores
bot.on('polling_error', (error) => {
    console.error('Error de polling:', error);
});
