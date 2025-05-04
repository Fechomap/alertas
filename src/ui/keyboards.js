// src/ui/keyboards.js

// Teclado persistente principal
function getPersistentKeyboard() {
  const apoyoText = '🤝 APOYO';
  const maniobrasText = '🚗 MANIOBRAS';
  
  return {
    keyboard: [
      [
        { text: apoyoText },
        { text: maniobrasText }
      ]
    ],
    resize_keyboard: true,    
    persistent: true,         
    one_time_keyboard: false, 
    is_persistent: true,      
    selective: false          
  };
}

// Teclado de confirmación para maniobras
function getConfirmationKeyboard() {
  return {
    keyboard: [
      [
        { text: '✅ Confirmar' },
        { text: '❌ Cancelar' }
      ]
    ],
    resize_keyboard: true,
    one_time_keyboard: true,
    // Evitar cualquier sugerencia de respuesta
    selective: false,
    input_field_placeholder: undefined
  };
}

module.exports = {
  getPersistentKeyboard,
  getConfirmationKeyboard
};