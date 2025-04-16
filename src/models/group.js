const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  chatId: { type: String, required: true, unique: true },
  displayName: { type: String, required: true }
});

const Group = mongoose.model('Group', groupSchema);

module.exports = Group;
