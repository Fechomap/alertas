import type { Bot } from 'grammy';
import { InlineKeyboard } from 'grammy';

import type { IReplyService } from '../../../application/ports/reply.service.interface.js';
import type { AlertHandler } from './alert.handler.js';
import type { GenerateWeeklyReportUseCase } from '../../../application/use-cases/report/generate-weekly-report.use-case.js';
import type { Env } from '../../../config/env.js';
import type { Logger } from '../../../infrastructure/logging/logger.js';
import type { BotContext } from '../../../container/types.js';
import { getMainKeyboardArray } from '../keyboards/main.keyboard.js';
import { MESSAGES } from '../../../shared/constants/messages.constants.js';
import { AlertType } from '../../../domain/value-objects/alert-type.vo.js';
import { getWeekRangeForOffset, formatWeekLabel } from '../../../shared/utils/date.util.js';

export class CommandHandler {
  private readonly alertManagerIds: bigint[];
  private readonly superAdminId: bigint;

  constructor(
    private readonly alertHandler: AlertHandler,
    private readonly env: Env,
    private readonly logger: Logger,
    private readonly replyService: IReplyService,
    private readonly generateWeeklyReportUseCase: GenerateWeeklyReportUseCase,
  ) {
    this.alertManagerIds = this.parseIds(this.env.ALERT_MANAGER_IDS);
    this.superAdminId = this.env.ADMIN_CHAT_ID ? BigInt(this.env.ADMIN_CHAT_ID) : 0n;
  }

  private parseIds(idsString?: string): bigint[] {
    if (!idsString) return [];
    return idsString
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0)
      .map((id) => BigInt(id));
  }

  register(bot: Bot<BotContext>): void {
    bot.command('start', async (ctx) => this.handleStart(ctx));
    bot.command('help', async (ctx) => this.handleHelp(ctx));
    bot.command('status', async (ctx) => this.handleStatus(ctx));
    bot.command('stopalert', async (ctx) => this.handleStopAlert(ctx));
    bot.command('alerts', async (ctx) => this.handleAlerts(ctx));
    bot.command('forcestop', async (ctx) => this.handleForceStop(ctx));
    bot.command('report', async (ctx) => this.handleReport(ctx));

    // Callback query for report week selection
    bot.callbackQuery(/^report:(-?\d+)$/, async (ctx) => {
      const userId = ctx.from?.id;
      const chatId = ctx.chat?.id;

      if (!userId || !chatId) return;

      if (!this.isAlertManager(userId)) {
        await ctx.answerCallbackQuery({ text: '⛔ Solo Alert Managers' });
        return;
      }

      const match = ctx.match;
      const offsetStr = match[1];
      if (!offsetStr) return;
      const offset = parseInt(offsetStr, 10);

      await ctx.answerCallbackQuery({ text: 'Generando reporte...' });
      await this.handleReportCallback(chatId, userId, offset);
    });

    this.logger.info('Command handlers registered');
  }

  private isAlertManager(userId: number): boolean {
    const userIdStr = userId.toString();
    return this.alertManagerIds.some((id) => id.toString() === userIdStr);
  }

  private isAdmin(userId: number): boolean {
    return userId.toString() === this.superAdminId.toString();
  }

  private async handleStart(ctx: BotContext): Promise<void> {
    const name = ctx.from?.first_name ?? 'Usuario';
    const keyboard = getMainKeyboardArray();

    await this.replyService.sendWithKeyboard(
      ctx.chat?.id ?? 0,
      `${MESSAGES.INFO.WELCOME}\n\n¡Hola ${name}! Usa los botones del teclado para interactuar.`,
      keyboard,
    );

    this.logger.info({ userId: ctx.from?.id }, '/start command');
  }

  private async handleHelp(ctx: BotContext): Promise<void> {
    const userId = ctx.from?.id;
    const isAdmin = userId ? this.isAdmin(userId) : false;
    const isAlertManager = userId ? this.isAlertManager(userId) : false;

    let helpText = MESSAGES.INFO.HELP;

    if (isAlertManager) {
      helpText +=
        '\n\n*Comandos de Alert Manager:*\n' +
        '/stopalert - Desactivar alerta del grupo\n' +
        '/report - Generar reporte semanal Excel';
    }

    if (isAdmin) {
      helpText +=
        '\n\n*Comandos de Admin:*\n' +
        '/alerts - Ver todas las alertas activas\n' +
        '/forcestop - Forzar parada de todas las alertas';
    }

    await ctx.reply(helpText, { parse_mode: 'Markdown' });
  }

  private async handleStatus(ctx: BotContext): Promise<void> {
    const alertCount = this.alertHandler.getActiveAlertsCount();
    const chatId = ctx.chat?.id;

    let statusMessage = `✅ *Bot funcionando correctamente*\n\n`;
    statusMessage += `📊 *Alertas activas globales:* ${alertCount}`;

    if (chatId) {
      const hasLocalAlert = this.alertHandler.hasActiveAlert(chatId, AlertType.CONFERENCIA);
      statusMessage += `\n📍 *Alerta en este grupo:* ${hasLocalAlert ? 'Sí' : 'No'}`;
    }

    await ctx.reply(statusMessage, { parse_mode: 'Markdown' });
  }

  private async handleStopAlert(ctx: BotContext): Promise<void> {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;

    if (!userId || !chatId) {
      this.logger.warn('Missing userId or chatId in stopalert handler');
      return;
    }

    if (!this.isAlertManager(userId)) {
      await this.replyService.sendWithKeyboard(
        chatId,
        '⛔ *Solo los Alert Manager pueden desactivar alertas.*',
        getMainKeyboardArray(),
      );
      return;
    }

    const result = await this.alertHandler.deactivateAlert(chatId, AlertType.CONFERENCIA);

    if (result.success) {
      this.logger.info({ userId, chatId, alertId: result.alertId }, '/stopalert command executed');
    }
  }

  private async handleAlerts(ctx: BotContext): Promise<void> {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;

    if (!userId || !chatId) return;

    if (!this.isAdmin(userId) && !this.isAlertManager(userId)) {
      await ctx.reply('⛔ *Comando solo disponible para administradores.*', {
        parse_mode: 'Markdown',
      });
      return;
    }

    const alerts = this.alertHandler.getActiveAlertsInfo();

    if (alerts.length === 0) {
      await ctx.reply('✅ *No hay alertas activas en el sistema.*', { parse_mode: 'Markdown' });
      return;
    }

    let message = `🚨 *Alertas Activas (${alerts.length}):*\n\n`;

    for (const alert of alerts) {
      message += `📌 *ID:* \`${alert.id.substring(0, 8)}...\`\n`;
      message += `   Chat: ${alert.chatId}\n`;
      message += `   Tipo: ${alert.alertType}\n`;
      message += `   Usuario: ${alert.userName}\n`;
      message += `   Duración: ${alert.durationSeconds}s\n`;
      message += `   Mensajes: ${alert.messageCount}\n\n`;
    }

    const consistency = this.alertHandler.checkConsistency();
    if (!consistency.isConsistent) {
      message += `\n⚠️ *Inconsistencias detectadas:*\n`;
      for (const issue of consistency.issues) {
        message += `- ${issue}\n`;
      }
    }

    await ctx.reply(message, { parse_mode: 'Markdown' });
  }

  private async handleForceStop(ctx: BotContext): Promise<void> {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;

    if (!userId || !chatId) return;

    if (!this.isAlertManager(userId) && !this.isAdmin(userId)) {
      await ctx.reply('⛔ *Comando solo disponible para Alert Managers y Administradores.*', {
        parse_mode: 'Markdown',
      });
      return;
    }

    this.logger.info({ userId, chatId }, '/forcestop initiated');

    const stoppedCount = await this.alertHandler.forceStopGroupAlerts(chatId);

    if (stoppedCount === 0) {
      await this.replyService.sendWithKeyboard(
        chatId,
        '✅ *No había alertas activas para detener.*',
        getMainKeyboardArray(),
      );
    }

    this.logger.info({ userId, chatId, stoppedCount }, '/forcestop completed');
  }

  private async handleReport(ctx: BotContext): Promise<void> {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;

    if (!userId || !chatId) return;

    if (!this.isAlertManager(userId)) {
      await ctx.reply('⛔ *Solo los Alert Manager pueden generar reportes.*', {
        parse_mode: 'Markdown',
      });
      return;
    }

    // Build inline keyboard with 5 week options
    const keyboard = new InlineKeyboard();
    for (let offset = 0; offset >= -4; offset--) {
      const label = formatWeekLabel(offset);
      keyboard.text(label, `report:${offset}`);
      if (offset > -4) keyboard.row();
    }

    await ctx.reply('📊 *Selecciona la semana para el reporte:*', {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });

    this.logger.info({ userId, chatId }, '/report command - showing week selection');
  }

  async handleReportCallback(chatId: number, userId: number, offset: number): Promise<void> {
    try {
      await this.replyService.sendMessage(chatId, '⏳ *Generando reporte semanal...*');

      const { start, end } = getWeekRangeForOffset(offset);
      const result = await this.generateWeeklyReportUseCase.execute({
        startDate: start,
        endDate: end,
      });

      await this.replyService.sendDocument(chatId, result.buffer, result.fileName, result.caption);

      this.logger.info(
        { userId, chatId, offset, recordCount: result.recordCount },
        'Report generated via callback',
      );
    } catch (error) {
      this.logger.error({ error, userId, chatId, offset }, 'Error generating report');
      await this.replyService.sendMessage(
        chatId,
        '❌ *Error al generar reporte. Por favor, intenta nuevamente.*',
      );
    }
  }
}
