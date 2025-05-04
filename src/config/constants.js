// IDs de usuarios autorizados
const operatorIds = [7143094298, 7754458578, 7509818905, 8048487029, 7241170867];
const alertManagerIds = [7143094298, 1022124142, 7758965062, 5660087041, 6330970125];
const SUPER_ADMIN_ID = 7143094298;

// Tipos de alertas y mensajes
// Only keep Conferencia alert type
const alertTypes = {
  Conferencia: {
    message: '⚠️⚠️ Cabina, por favor apóyame con una conferencia. ¡Gracias! 📞'
  }
  // Removed USUARIO_NO_ESTA_EN_VH and VALIDACION_DE_ORIGEN
};

// Remove unused button actions
const buttonActions = {
  '📞 CONFERENCIA': 'Conferencia',
  '🚗 MANIOBRAS': 'Maniobras'
};

// Remove unused cancellation messages
const cancelationMessages = {
  'Conferencia': '🆗🆗 *CONFERENCIA* atendida. 📞 Enseguida le llaman. Alerta desactivada. ¡Gracias! ✔️'
  // Removed messages for USUARIO_NO_ESTA_EN_VH and VALIDACION_DE_ORIGEN
};

module.exports = {
  operatorIds,
  alertManagerIds,
  SUPER_ADMIN_ID,
  alertTypes,
  buttonActions,
  cancelationMessages
};
