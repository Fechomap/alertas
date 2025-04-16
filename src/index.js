/*****************************************
 * BOT DE SOPORTE - ENTRADA PRINCIPAL    *
 *****************************************/
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');

const { database } = require('./config/database');
const { setupHandlers } = require('./handlers');

// Variables de entorno
const token = process.env.TELEGRAM_BOT_TOKEN;
const url = process.env.HEROKU_APP_URL || 'https://tu-app-en-heroku.herokuapp.com';
const environment = process.env.NODE_ENV || 'development';

// Inicialización del bot
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

// Conectar a la base de datos
database.connect();

// Configurar manejadores
setupHandlers(bot);

// Manejo de errores
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

// Configuración del servidor Express
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
