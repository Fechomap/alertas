export enum AlertType {
  CONFERENCIA = 'CONFERENCIA',
}

export const ALERT_MESSAGES: Record<AlertType, string> = {
  [AlertType.CONFERENCIA]: '⚠️⚠️ Cabina, por favor apoyame con una conferencia. ¡Gracias! 📞',
};

export const CANCELLATION_MESSAGES: Record<AlertType, string> = {
  [AlertType.CONFERENCIA]:
    '🆗🆗 *CONFERENCIA* atendida. 📞 Enseguida le llaman. Alerta desactivada. ¡Gracias! ✔️',
};
