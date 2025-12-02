import type { Bot } from 'grammy';
import { InlineKeyboard } from 'grammy';

import type { IReplyService } from '../../../application/ports/reply.service.interface.js';
import type { AlertHandler } from './alert.handler.js';
import type { GenerateWeeklyReportUseCase } from '../../../application/use-cases/report/generate-weekly-report.use-case.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import type { Env } from '../../../config/env.js';
import type { Logger } from '../../../infrastructure/logging/logger.js';
import type { BotContext } from '../../../container/types.js';
import { getMainKeyboardArray } from '../keyboards/main.keyboard.js';
import { MESSAGES } from '../../../shared/constants/messages.constants.js';
import { AlertType } from '../../../domain/value-objects/alert-type.vo.js';
import { UserRole } from '../../../domain/value-objects/user-role.vo.js';
import { getWeekRangeForOffset, formatWeekLabel } from '../../../shared/utils/date.util.js';

export class CommandHandler {
  private readonly superAdminId: bigint;

  constructor(
    private readonly alertHandler: AlertHandler,
    private readonly env: Env,
    private readonly logger: Logger,
    private readonly replyService: IReplyService,
    private readonly generateWeeklyReportUseCase: GenerateWeeklyReportUseCase,
    private readonly userRepository: IUserRepository,
  ) {
    this.superAdminId = this.env.ADMIN_CHAT_ID ? BigInt(this.env.ADMIN_CHAT_ID) : 0n;
  }

  private async getUserRole(userId: number): Promise<UserRole | null> {
    const user = await this.userRepository.findByTelegramId(BigInt(userId));
    return user?.role ?? null;
  }

  private async isAlertManager(userId: number): Promise<boolean> {
    const role = await this.getUserRole(userId);
    return role === UserRole.ALERT_MANAGER || role === UserRole.ADMIN;
  }

  private isAdmin(userId: number): boolean {
    return userId.toString() === this.superAdminId.toString();
  }

  register(bot: Bot<BotContext>): void {
    bot.command('start', async (ctx) => this.handleStart(ctx));
    bot.command('help', async (ctx) => this.handleHelp(ctx));
    bot.command('status', async (ctx) => this.handleStatus(ctx));
    bot.command('stopalert', async (ctx) => this.handleStopAlert(ctx));
    bot.command('alerts', async (ctx) => this.handleAlerts(ctx));
    bot.command('forcestop', async (ctx) => this.handleForceStop(ctx));
    bot.command('report', async (ctx) => this.handleReport(ctx));
    bot.command('users', async (ctx) => this.handleUsers(ctx));

    // Callback query for report week selection
    bot.callbackQuery(/^report:(-?\d+)$/, async (ctx) => {
      const userId = ctx.from?.id;
      const chatId = ctx.chat?.id;

      if (!userId || !chatId) return;

      if (!(await this.isAlertManager(userId))) {
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

    // Callback query for showing user role options
    bot.callbackQuery(/^user:(\d+)$/, async (ctx) => {
      const adminId = ctx.from?.id;
      const chatId = ctx.chat?.id;

      if (!adminId || !chatId) return;

      if (!this.isAdmin(adminId)) {
        await ctx.answerCallbackQuery({ text: '⛔ Solo Admin' });
        return;
      }

      const match = ctx.match;
      const targetTelegramId = match[1];
      if (!targetTelegramId) return;

      await ctx.answerCallbackQuery({ text: 'Cargando opciones...' });
      await this.showRoleOptions(ctx, BigInt(targetTelegramId));
    });

    // Callback query for role management
    bot.callbackQuery(/^role:(\w+):(\d+)$/, async (ctx) => {
      const adminId = ctx.from?.id;
      const chatId = ctx.chat?.id;

      if (!adminId || !chatId) return;

      if (!this.isAdmin(adminId)) {
        await ctx.answerCallbackQuery({ text: '⛔ Solo Admin' });
        return;
      }

      const match = ctx.match;
      const roleStr = match[1];
      const targetTelegramId = match[2];
      if (!roleStr || !targetTelegramId) return;

      await ctx.answerCallbackQuery({ text: 'Actualizando rol...' });
      await this.handleRoleCallback(chatId, adminId, roleStr, BigInt(targetTelegramId));
    });

    // Callback query for canceling role change
    bot.callbackQuery('cancel_role', async (ctx) => {
      await ctx.answerCallbackQuery({ text: 'Cancelado' });
      await ctx.deleteMessage();
    });

    this.logger.info('Command handlers registered');
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
    const isAlertManager = userId ? await this.isAlertManager(userId) : false;

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
        '/forcestop - Forzar parada de todas las alertas\n' +
        '/users - Gestionar roles de usuarios';
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

    if (!(await this.isAlertManager(userId))) {
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

    if (!this.isAdmin(userId) && !(await this.isAlertManager(userId))) {
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

    if (!(await this.isAlertManager(userId)) && !this.isAdmin(userId)) {
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

    if (!(await this.isAlertManager(userId))) {
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

  private async handleUsers(ctx: BotContext): Promise<void> {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;

    if (!userId || !chatId) return;

    if (!this.isAdmin(userId)) {
      await ctx.reply('⛔ *Solo el administrador puede gestionar usuarios.*', {
        parse_mode: 'Markdown',
      });
      return;
    }

    try {
      const users = await this.userRepository.findAll();

      if (users.length === 0) {
        await ctx.reply('📋 *No hay usuarios registrados.*', { parse_mode: 'Markdown' });
        return;
      }

      let message = `👥 *Usuarios Registrados (${users.length}):*\n\n`;

      for (const user of users) {
        const roleEmoji = this.getRoleEmoji(user.role);
        const name = user.firstName || user.username || `ID: ${user.telegramId}`;
        message += `${roleEmoji} *${name}*\n`;
        message += `   Rol: ${user.role}\n`;
        message += `   TG: \`${user.telegramId}\`\n\n`;
      }

      message += '\n_Para cambiar rol, usa los botones:_';

      // Build inline keyboard for each user
      const keyboard = new InlineKeyboard();
      for (const user of users.slice(0, 10)) {
        const name = user.firstName || user.username || `${user.telegramId}`;
        keyboard.text(`👤 ${name}`, `user:${user.telegramId}`).row();
      }

      if (users.length > 10) {
        message += `\n\n_Mostrando primeros 10 de ${users.length} usuarios._`;
      }

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });

      this.logger.info({ adminId: userId, userCount: users.length }, '/users command');
    } catch (error) {
      this.logger.error({ error }, 'Error fetching users');
      await ctx.reply('❌ *Error al obtener usuarios.*', { parse_mode: 'Markdown' });
    }
  }

  private getRoleEmoji(role: UserRole): string {
    switch (role) {
      case UserRole.ADMIN:
        return '👑';
      case UserRole.ALERT_MANAGER:
        return '🔔';
      case UserRole.OPERATOR:
        return '🎧';
      case UserRole.USER:
      default:
        return '👤';
    }
  }

  private async handleRoleCallback(
    chatId: number,
    adminId: number,
    roleStr: string,
    targetTelegramId: bigint,
  ): Promise<void> {
    try {
      const role = roleStr as UserRole;
      if (!Object.values(UserRole).includes(role)) {
        await this.replyService.sendMessage(chatId, '❌ *Rol inválido.*');
        return;
      }

      const updated = await this.userRepository.updateRole(targetTelegramId, role);

      if (!updated) {
        await this.replyService.sendMessage(chatId, '❌ *Usuario no encontrado.*');
        return;
      }

      const roleEmoji = this.getRoleEmoji(role);
      const name = updated.firstName || updated.username || `ID: ${updated.telegramId}`;

      await this.replyService.sendMessage(
        chatId,
        `✅ *Rol actualizado*\n\n${roleEmoji} *${name}* ahora es *${role}*`,
      );

      this.logger.info(
        { adminId, targetTelegramId: targetTelegramId.toString(), newRole: role },
        'User role updated',
      );
    } catch (error) {
      this.logger.error(
        { error, targetTelegramId: targetTelegramId.toString() },
        'Error updating role',
      );
      await this.replyService.sendMessage(chatId, '❌ *Error al actualizar rol.*');
    }
  }

  private async showRoleOptions(ctx: BotContext, targetTelegramId: bigint): Promise<void> {
    try {
      const user = await this.userRepository.findByTelegramId(targetTelegramId);

      if (!user) {
        await ctx.reply('❌ *Usuario no encontrado.*', { parse_mode: 'Markdown' });
        return;
      }

      const name = user.firstName || user.username || `ID: ${user.telegramId}`;
      const currentRole = user.role;
      const roleEmoji = this.getRoleEmoji(currentRole);

      const message =
        `👤 *${name}*\n\n` +
        `Rol actual: ${roleEmoji} *${currentRole}*\n\n` +
        `_Selecciona el nuevo rol:_`;

      const keyboard = new InlineKeyboard();

      // Add role buttons (excluding current role)
      const roles = [UserRole.USER, UserRole.OPERATOR, UserRole.ALERT_MANAGER];
      for (const role of roles) {
        if (role !== currentRole) {
          const emoji = this.getRoleEmoji(role);
          keyboard.text(`${emoji} ${role}`, `role:${role}:${targetTelegramId}`);
        }
      }
      keyboard.row();
      keyboard.text('❌ Cancelar', 'cancel_role');

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    } catch (error) {
      this.logger.error({ error }, 'Error showing role options');
      await ctx.reply('❌ *Error al mostrar opciones.*', { parse_mode: 'Markdown' });
    }
  }
}
