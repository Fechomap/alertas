const mongoose = require('mongoose');

const maniobraSchema = new mongoose.Schema({
  chatId: { type: String, required: true },
  groupName: { type: String, required: true },
  alertManagerId: { type: Number, required: true },
  maniobras: { type: Number, required: true, min: 1, max: 10 },
  descripcion: { type: String, required: true },
  fecha: { type: Date, default: Date.now }
});

const Maniobra = mongoose.model('Maniobra', maniobraSchema);

module.exports = Maniobra;