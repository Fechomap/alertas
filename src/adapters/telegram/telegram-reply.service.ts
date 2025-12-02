import type { Bot } from 'grammy';
import { InputFile, InlineKeyboard } from 'grammy';

import type {
  IReplyService,
  InlineKeyboardData,
} from '../../application/ports/reply.service.interface.js';
import type { BotContext } from '../../container/types.js';

/**
 * Implementación de IReplyService para Telegram.
 * Esta clase rompe la dependencia circular entre TelegramAdapter y los Handlers.
 */
export class TelegramReplyService implements IReplyService {
  constructor(private readonly bot: Bot<BotContext>) {}

  async sendMessage(chatId: string | number, text: string): Promise<void> {
    await this.bot.api.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
    });
  }

  async sendWithKeyboard(
    chatId: string | number,
    text: string,
    keyboard: string[][],
  ): Promise<void> {
    await this.bot.api.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      reply_markup: {
        keyboard,
        resize_keyboard: true,
        is_persistent: true,
      },
    });
  }

  async sendWithInlineKeyboard(
    chatId: string | number,
    text: string,
    inlineKeyboard: InlineKeyboardData,
  ): Promise<void> {
    const keyboard = new InlineKeyboard();

    for (const row of inlineKeyboard.buttons) {
      for (const button of row) {
        keyboard.text(button.text, button.callbackData);
      }
      keyboard.row();
    }

    await this.bot.api.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  }

  async sendDocument(
    chatId: string | number,
    document: Buffer,
    fileName: string,
    caption?: string,
  ): Promise<void> {
    const inputFile = new InputFile(document, fileName);
    await this.bot.api.sendDocument(chatId, inputFile, {
      caption,
      parse_mode: 'Markdown',
    });
  }
}
