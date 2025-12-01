export const MAIN_KEYBOARD = {
  keyboard: [[{ text: '📞 CONFERENCIA' }, { text: '🚗 MANIOBRAS' }]],
  resize_keyboard: true,
  is_persistent: true,
};

export const CONFIRMATION_KEYBOARD = {
  keyboard: [[{ text: '✅ Confirmar' }, { text: '❌ Cancelar' }]],
  resize_keyboard: true,
  one_time_keyboard: true,
};

export function getMainKeyboardArray(): string[][] {
  return [['📞 CONFERENCIA', '🚗 MANIOBRAS']];
}

export function getConfirmationKeyboardArray(): string[][] {
  return [['✅ Confirmar', '❌ Cancelar']];
}
