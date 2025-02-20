// config.js
require('dotenv').config();
const mongoose = require('mongoose');

const config = {
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/maniobras_bot',
  groupSchema: new mongoose.Schema({
    chatId: { type: String, required: true, unique: true },
    displayName: { type: String, required: true }
  }),
  maniobraSchema: new mongoose.Schema({
    chatId: { type: String, required: true },
    groupName: { type: String, required: true },
    alertManagerId: { type: Number, required: true },
    maniobras: { type: Number, required: true, min: 1, max: 10 },
    descripcion: { type: String, required: true },
    fecha: { type: Date, default: Date.now }
  })
};

module.exports = config;