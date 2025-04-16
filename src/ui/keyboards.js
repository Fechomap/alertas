// src/ui/keyboards.js
const buttonActions = require('../config/constants').buttonActions;

// Helper to find callback_data from button text (used for consistency)
function getCallbackData(buttonText) {
  return buttonActions[buttonText] || buttonText; // Default to text if not found
}

function getMainMenuKeyboard() {
  const apoyoText = '🤝 APOYO';
  const maniobrasText = '🚗 MANIOBRAS';
  return {
    inline_keyboard: [
      [
        { text: apoyoText, callback_data: getCallbackData(apoyoText) },
        { text: maniobrasText, callback_data: getCallbackData(maniobrasText) }
      ]
    ]
  };
}

function getApoyoMenuKeyboard() {
  const conferenciaText = '📞 CONFERENCIA';
  const regresarText = '🔙 Regresar'; // Special case for navigation

  return {
    inline_keyboard: [
      [
        // Only show Conferencia button
        { text: conferenciaText, callback_data: getCallbackData(conferenciaText) }
      ],
      [
        // Using 'MAIN_MENU' as callback_data for regresar to simplify handling
        { text: regresarText, callback_data: 'MAIN_MENU' } 
      ]
    ]
  };
}

// Confirmation keyboard can remain a reply keyboard or become inline
// Let's make it inline for consistency
function getConfirmationKeyboard() {
   const confirmarText = '✅ Confirmar';
   const cancelarText = '❌ Cancelar';
  return {
    inline_keyboard: [
      [
        // Using simple 'CONFIRM' and 'CANCEL' for callback_data
        { text: confirmarText, callback_data: 'CONFIRM' }, 
        { text: cancelarText, callback_data: 'CANCEL' }
      ]
    ]
  };
}

module.exports = {
  getMainMenuKeyboard,
  getApoyoMenuKeyboard,
  getConfirmationKeyboard
};
