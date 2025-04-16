// IDs de usuarios autorizados
const operatorIds = [7143094298, 7754458578, 7509818905, 8048487029];
const alertManagerIds = [7143094298, 1022124142, 7758965062, 5660087041, 6330970125];
const SUPER_ADMIN_ID = 7143094298;

// Tipos de alertas y mensajes
const alertTypes = {
  Conferencia: {
    message: '⚠️⚠️ Cabina, por favor apóyame con una conferencia. ¡Gracias! 📞'
  },
  USUARIO_NO_ESTA_EN_VH: {
    message: '⚠️⚠️ Cabina, por favor apóyame avisando al usuario que salga. ¡Gracias! 🚗'
  },
  VALIDACION_DE_ORIGEN: {
    message: '⚠️⚠️ Cabina, por favor apóyame con la validación del origen. ¡Gracias! 📍'
  }
};

const buttonActions = {
  '🤝 APOYO': 'APOYO',
  '🚗 MANIOBRAS': 'Maniobras',
  '📞 CONFERENCIA': 'Conferencia',
  '🚫 NA NO ESTA EN VH': 'USUARIO_NO_ESTA_EN_VH',
  '🔍 VALIDAR ORIGEN': 'VALIDACION_DE_ORIGEN'
};

const cancelationMessages = {
  'Conferencia': '🆗🆗 *CONFERENCIA* atendida. 📞 Enseguida le llaman. Alerta desactivada. ¡Gracias! ✔️',
  'USUARIO_NO_ESTA_EN_VH': '🆗🆗 Se está gestionando el contacto con el usuario para que salga. 📞 Alerta desactivada. ¡Gracias! ✔️',
  'VALIDACION_DE_ORIGEN': '🆗🆗 Se está gestionando el contacto con el usuario para verificar su ubicación. 📞 Alerta desactivada. ¡Gracias! ✔️'
};

module.exports = {
  operatorIds,
  alertManagerIds,
  SUPER_ADMIN_ID,
  alertTypes,
  buttonActions,
  cancelationMessages
};
