import type { Bot } from 'grammy';

import type { IReplyService } from '../../../application/ports/reply.service.interface.js';
import type { AlertHandler } from './alert.handler.js';
import type { Logger } from '../../../infrastructure/logging/logger.js';
import type { BotContext } from '../../../container/types.js';
import type { IManiobraRepository } from '../../../domain/repositories/maniobra.repository.interface.js';
import type { IGroupRepository } from '../../../domain/repositories/group.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import { AlertType } from '../../../domain/value-objects/alert-type.vo.js';
import { UserRole } from '../../../domain/value-objects/user-role.vo.js';
import { getMainKeyboardArray, getConfirmationKeyboardArray } from '../keyboards/main.keyboard.js';

interface ManiobraState {
  chatId: number;
  step: 'awaiting_quantity' | 'confirming';
  data: {
    quantity?: number;
  };
}

export class MessageHandler {
  private readonly userStates: Map<number, ManiobraState> = new Map();

  constructor(
    private readonly alertHandler: AlertHandler,
    private readonly logger: Logger,
    private readonly replyService: IReplyService,
    private readonly maniobraRepository: IManiobraRepository,
    private readonly groupRepository: IGroupRepository,
    private readonly userRepository: IUserRepository,
  ) {
    this.logger.info('Message handler initialized (roles from DB)');
  }

  private async ensureUserRegistered(ctx: BotContext): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    await this.userRepository.upsert({
      telegramId: BigInt(userId),
      username: ctx.from?.username,
      firstName: ctx.from?.first_name,
      lastName: ctx.from?.last_name,
    });
  }

  private async getUserRole(userId: number): Promise<UserRole | null> {
    const user = await this.userRepository.findByTelegramId(BigInt(userId));
    return user?.role ?? null;
  }

  private async isOperator(userId: number): Promise<boolean> {
    const role = await this.getUserRole(userId);
    return role === UserRole.OPERATOR || role === UserRole.ADMIN;
  }

  private async isAlertManager(userId: number): Promise<boolean> {
    const role = await this.getUserRole(userId);
    return role === UserRole.ALERT_MANAGER || role === UserRole.ADMIN;
  }

  register(bot: Bot<BotContext>): void {
    bot.hears('📞 CONFERENCIA', async (ctx) => this.handleConferenciaToggle(ctx));
    bot.hears('🚗 MANIOBRAS', async (ctx) => this.handleManiobras(ctx));
    bot.hears('✅ Confirmar', async (ctx) => this.handleConfirmManiobra(ctx));
    bot.hears('❌ Cancelar', async (ctx) => this.handleCancelManiobra(ctx));
    bot.on('message:text', async (ctx) => this.handleTextMessage(ctx));

    this.logger.info('Message handlers registered');
  }

  private async handleConferenciaToggle(ctx: BotContext): Promise<void> {
    const chatId = ctx.chat?.id;
    const userId = ctx.from?.id;
    const userName = ctx.from?.first_name ?? 'Usuario';

    if (!chatId || !userId) {
      this.logger.warn('Missing chatId or userId in conferencia handler');
      return;
    }

    // Auto-register user
    await this.ensureUserRegistered(ctx);

    const isOperator = await this.isOperator(userId);
    const isAlertManager = await this.isAlertManager(userId);
    const hasActiveAlert = this.alertHandler.hasActiveAlert(chatId, AlertType.CONFERENCIA);

    this.logger.info(
      { userId, userName, chatId, isOperator, isAlertManager, hasActiveAlert },
      'Conferencia toggle',
    );

    if (hasActiveAlert) {
      if (isAlertManager) {
        this.logger.info({ userId }, 'Alert Manager attempting to deactivate');
        const result = await this.alertHandler.deactivateAlert(chatId, AlertType.CONFERENCIA);

        if (result.success) {
          this.logger.info({ userId, alertId: result.alertId }, 'Alert deactivated by manager');
        } else {
          this.logger.warn({ userId, error: result.error }, 'Deactivation failed');
        }
      } else {
        await this.replyService.sendWithKeyboard(
          chatId,
          '⚠️ *Ya hay una alerta activa.*\n\nSolo un Alert Manager puede desactivarla.',
          getMainKeyboardArray(),
        );
        this.logger.warn({ userId }, 'User cannot deactivate (not Alert Manager)');
      }
      return;
    }

    if (isOperator) {
      this.logger.info({ userId }, 'Operator attempting to activate');

      const result = await this.alertHandler.startAlert(
        chatId,
        userId,
        userName,
        AlertType.CONFERENCIA,
      );

      if (result.success) {
        this.logger.info({ userId, alertId: result.alertId }, 'Alert activated by operator');
      } else {
        await this.replyService.sendWithKeyboard(
          chatId,
          `⚠️ *${result.error}*`,
          getMainKeyboardArray(),
        );
        this.logger.warn({ userId, error: result.error }, 'Activation failed');
      }
      return;
    }

    this.logger.warn({ userId }, 'User has no permissions');
    await this.replyService.sendWithKeyboard(
      chatId,
      '⛔ *No tienes permisos para activar alertas.*\n\nContacta al administrador.',
      getMainKeyboardArray(),
    );
  }

  private async handleManiobras(ctx: BotContext): Promise<void> {
    const chatId = ctx.chat?.id;
    const userId = ctx.from?.id;

    if (!chatId || !userId) {
      this.logger.warn('Missing chatId or userId in maniobras handler');
      return;
    }

    // Auto-register user
    await this.ensureUserRegistered(ctx);

    if (!(await this.isAlertManager(userId))) {
      await this.replyService.sendWithKeyboard(
        chatId,
        '⛔ *Solo los Alert Manager pueden registrar maniobras.*',
        getMainKeyboardArray(),
      );
      return;
    }

    this.userStates.set(userId, {
      chatId,
      step: 'awaiting_quantity',
      data: {},
    });

    await ctx.reply('🔢 *¿Cuántas maniobras autorizadas? (1-10)*\n\nEscribe el número:', {
      parse_mode: 'Markdown',
      reply_markup: {
        keyboard: getMainKeyboardArray(),
        resize_keyboard: true,
        is_persistent: true,
      },
    });

    this.logger.info({ userId }, 'Maniobras flow started');
  }

  private async handleTextMessage(ctx: BotContext): Promise<void> {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;
    const text = ctx.message?.text;

    if (!userId || !chatId || !text) return;

    const state = this.userStates.get(userId);
    if (!state || state.chatId !== chatId) return;

    if (
      text === '📞 CONFERENCIA' ||
      text === '🚗 MANIOBRAS' ||
      text === '✅ Confirmar' ||
      text === '❌ Cancelar' ||
      text.startsWith('/')
    ) {
      return;
    }

    if (state.step === 'awaiting_quantity') {
      await this.handleQuantityInput(ctx, userId, text, chatId);
    }
  }

  private async handleQuantityInput(
    ctx: BotContext,
    userId: number,
    text: string,
    chatId: number,
  ): Promise<void> {
    const quantity = parseInt(text, 10);

    if (isNaN(quantity) || quantity < 1 || quantity > 10) {
      await this.replyService.sendWithKeyboard(
        chatId,
        '❌ *Por favor, ingresa un número válido entre 1 y 10.*',
        getMainKeyboardArray(),
      );
      return;
    }

    const state = this.userStates.get(userId);
    if (!state) return;

    state.data.quantity = quantity;
    state.step = 'confirming';
    this.userStates.set(userId, state);

    const confirmMessage = `*¿Confirmas el registro de ${quantity} maniobra(s)?*`;

    await ctx.reply(confirmMessage, {
      parse_mode: 'Markdown',
      reply_markup: {
        keyboard: getConfirmationKeyboardArray(),
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  }

  private async handleConfirmManiobra(ctx: BotContext): Promise<void> {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;

    if (!userId || !chatId) return;

    const state = this.userStates.get(userId);
    if (!state || state.step !== 'confirming' || state.chatId !== chatId) {
      return;
    }

    const quantity = state.data.quantity;
    if (!quantity) {
      this.userStates.delete(userId);
      return;
    }

    try {
      let group = await this.groupRepository.findByChatId(chatId.toString());
      if (!group) {
        const chatInfo = await ctx.api.getChat(chatId);
        const groupName = 'title' in chatInfo ? chatInfo.title : `Grupo ${chatId}`;
        group = await this.groupRepository.create({
          chatId: chatId.toString(),
          name: groupName ?? `Grupo ${chatId}`,
        });
      }

      let user = await this.userRepository.findByTelegramId(BigInt(userId));
      if (!user) {
        user = await this.userRepository.create({
          telegramId: BigInt(userId),
          firstName: ctx.from?.first_name,
          username: ctx.from?.username,
          role: UserRole.ALERT_MANAGER,
        });
      }

      await this.maniobraRepository.create({
        groupId: group.id,
        userId: user.id,
        cantidad: quantity,
        descripcion: `Registro de ${quantity} maniobras autorizadas`,
        fecha: new Date(),
      });

      const confirmMessage =
        '✅ *Maniobras registradas exitosamente*\n\n' +
        `🏢 *Grupo:* ${group.name}\n` +
        `🔢 *Cantidad:* ${quantity}\n` +
        `📅 *Fecha:* ${new Date().toLocaleDateString('es-MX')}`;

      await this.replyService.sendWithKeyboard(chatId, confirmMessage, getMainKeyboardArray());

      this.logger.info({ quantity, userId, groupName: group.name }, 'Maniobra registered');
    } catch (error) {
      this.logger.error({ error }, 'Error saving maniobra');
      await this.replyService.sendWithKeyboard(
        chatId,
        '❌ *Error al guardar las maniobras. Por favor, intenta nuevamente.*',
        getMainKeyboardArray(),
      );
    } finally {
      this.userStates.delete(userId);
    }
  }

  private async handleCancelManiobra(ctx: BotContext): Promise<void> {
    const userId = ctx.from?.id;
    const chatId = ctx.chat?.id;

    if (!userId || !chatId) return;

    const state = this.userStates.get(userId);
    if (!state || state.chatId !== chatId) {
      return;
    }

    this.userStates.delete(userId);

    await this.replyService.sendWithKeyboard(
      chatId,
      '❌ *Registro de maniobras cancelado.*',
      getMainKeyboardArray(),
    );
  }

  clearUserStates(chatId: number): void {
    for (const [userId, state] of this.userStates.entries()) {
      if (state.chatId === chatId) {
        this.userStates.delete(userId);
      }
    }
  }
}
