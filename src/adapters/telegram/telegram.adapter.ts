import type { Bot } from 'grammy';
import { GrammyError, HttpError } from 'grammy';

import type { Env } from '../../config/env.js';
import type { Logger } from '../../infrastructure/logging/logger.js';
import type { BotContext } from '../../container/types.js';
import type { CommandHandler } from './handlers/command.handler.js';
import type { MessageHandler } from './handlers/message.handler.js';
import type { AlertHandler } from './handlers/alert.handler.js';

export class TelegramAdapter {
  private isRunning = false;

  constructor(
    private readonly bot: Bot<BotContext>,
    private readonly env: Env,
    private readonly logger: Logger,
    private readonly commandHandler: CommandHandler,
    private readonly messageHandler: MessageHandler,
    private readonly alertHandler: AlertHandler,
  ) {
    this.setupErrorHandling();
    this.setupHandlers();
  }

  private setupErrorHandling(): void {
    this.bot.catch((err) => {
      const ctx = err.ctx;
      const error = err.error;

      this.logger.error({ updateId: ctx.update.update_id }, 'Error handling update');

      if (error instanceof GrammyError) {
        this.logger.error({ description: error.description }, 'Grammy error');
      } else if (error instanceof HttpError) {
        this.logger.error({ message: error.message }, 'HTTP error');
      } else {
        this.logger.error({ error: String(error) }, 'Unknown error');
      }
    });
  }

  private setupHandlers(): void {
    // Registrar handlers de comandos
    this.commandHandler.register(this.bot);

    // Registrar handlers de mensajes
    this.messageHandler.register(this.bot);

    this.logger.info('Telegram handlers registered');
  }

  async startPolling(): Promise<void> {
    if (this.isRunning) return;

    const isDev = this.env.NODE_ENV === 'development';
    if (!isDev) {
      this.logger.warn('Polling should only be used in development');
    }

    await this.bot.start({
      onStart: (botInfo) => {
        this.logger.info({ username: botInfo.username }, 'Bot started with polling');
      },
    });

    this.isRunning = true;
  }

  async setupWebhook(webhookUrl: string, secretToken?: string): Promise<void> {
    if (this.isRunning) return;

    await this.bot.api.setWebhook(webhookUrl, {
      secret_token: secretToken,
      allowed_updates: ['message', 'callback_query', 'my_chat_member'],
    });

    this.logger.info({ webhookUrl }, 'Webhook configured');
    this.isRunning = true;
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    // Detener alertas activas
    this.alertHandler.forceStopAllAlerts();

    await this.bot.stop();
    this.isRunning = false;
    this.logger.info('Bot stopped');
  }

  async sendDocument(
    chatId: string | number,
    document: Parameters<Bot['api']['sendDocument']>[1],
    options?: Parameters<Bot['api']['sendDocument']>[2],
  ): Promise<ReturnType<Bot['api']['sendDocument']>> {
    return this.bot.api.sendDocument(chatId, document, options);
  }

  getBot(): Bot<BotContext> {
    return this.bot;
  }
}
