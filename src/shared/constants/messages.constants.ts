export const MESSAGES = {
  ERRORS: {
    GENERIC: '❌ Ha ocurrido un error. Por favor, intenta nuevamente.',
    UNAUTHORIZED: '🚫 No tienes permisos para realizar esta accion.',
    ALERT_LIMIT_EXCEEDED: '⚠️ Has alcanzado el limite de alertas activas.',
    ALERT_NOT_FOUND: '🚫 No se encontro una alerta activa de este tipo para cancelar.',
    RATE_LIMITED: '⏰ Por favor espera un momento antes de intentar de nuevo.',
  },
  SUCCESS: {
    ALERT_STARTED: '✅ Alerta iniciada correctamente.',
    ALERT_STOPPED: '✅ Alerta detenida correctamente.',
    MANIOBRA_REGISTERED: '✅ Maniobra registrada correctamente.',
  },
  INFO: {
    WELCOME: '👋 ¡Bienvenido al Bot de Alertas!',
    HELP: '📚 Comandos disponibles:\n/start - Iniciar\n/help - Ayuda',
  },
} as const;
