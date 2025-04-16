function getMainMenuKeyboard() {
  return {
    keyboard: [
      ['🤝 APOYO', '🚗 MANIOBRAS']
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  };
}

function getApoyoMenuKeyboard() {
  return {
    keyboard: [
      ['📞 CONFERENCIA', '🚫 NA NO ESTA EN VH', '🔍 VALIDAR ORIGEN'],
      ['🔙 Regresar']
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  };
}

function getConfirmationKeyboard() {
  return {
    keyboard: [
      ['✅ Confirmar', '❌ Cancelar']
    ],
    resize_keyboard: true,
    one_time_keyboard: true
  };
}

module.exports = {
  getMainMenuKeyboard,
  getApoyoMenuKeyboard,
  getConfirmationKeyboard
};