/**
 * Interface para servicios de respuesta a mensajes.
 * Abstrae la plataforma de mensajería (Telegram, WhatsApp, etc.)
 * permitiendo que los handlers sean agnósticos a la implementación.
 */
export interface IReplyService {
  /**
   * Envía un mensaje con un teclado personalizado
   */
  sendWithKeyboard(
    chatId: string | number,
    text: string,
    keyboard: string[][],
  ): Promise<void>;

  /**
   * Envía un mensaje simple
   */
  sendMessage(chatId: string | number, text: string): Promise<void>;

  /**
   * Envía un documento/archivo
   */
  sendDocument(
    chatId: string | number,
    document: Buffer,
    fileName: string,
    caption?: string,
  ): Promise<void>;
}
