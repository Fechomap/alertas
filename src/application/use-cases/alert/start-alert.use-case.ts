import type { IUseCase } from '../../interfaces/use-case.interface.js';
import type { IAlertRepository } from '../../../domain/repositories/alert.repository.interface.js';
import type { IGroupRepository } from '../../../domain/repositories/group.repository.interface.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import type { AlertType } from '../../../domain/value-objects/alert-type.vo.js';
import { ALERT_MESSAGES } from '../../../domain/value-objects/alert-type.vo.js';
import { AlertLimitExceededError } from '../../../domain/errors/alert-limit-exceeded.error.js';
import { APP_CONSTANTS } from '../../../shared/constants/app.constants.js';
import type { Logger } from '../../../infrastructure/logging/logger.js';

export interface StartAlertInput {
  chatId: string;
  telegramUserId: bigint;
  alertType: AlertType;
  userName: string;
}

export interface StartAlertOutput {
  alertId: string;
  message: string;
}

export class StartAlertUseCase implements IUseCase<StartAlertInput, StartAlertOutput> {
  constructor(
    private readonly alertRepository: IAlertRepository,
    private readonly groupRepository: IGroupRepository,
    private readonly userRepository: IUserRepository,
    private readonly logger: Logger,
  ) {}

  private async getOrCreateGroup(chatId: string): Promise<{ id: string }> {
    const group = await this.groupRepository.findByChatId(chatId);
    return group ?? (await this.groupRepository.create({ chatId, name: `Group ${chatId}` }));
  }

  private async getOrCreateUser(telegramId: bigint, name: string): Promise<{ id: string }> {
    const user = await this.userRepository.findByTelegramId(telegramId);
    return user ?? (await this.userRepository.create({ telegramId, firstName: name }));
  }

  private async validateAlertLimit(groupId: string, userId: string): Promise<void> {
    const count = await this.alertRepository.countActiveByGroupAndUser(groupId, userId);
    if (count >= APP_CONSTANTS.LIMITS.MAX_ALERTS_PER_USER) {
      throw new AlertLimitExceededError(userId, APP_CONSTANTS.LIMITS.MAX_ALERTS_PER_USER);
    }
  }

  async execute(input: StartAlertInput): Promise<StartAlertOutput> {
    const { chatId, telegramUserId, alertType, userName } = input;

    const group = await this.getOrCreateGroup(chatId);
    const user = await this.getOrCreateUser(telegramUserId, userName);

    const existing = await this.alertRepository.findByGroupAndUserAndType(
      group.id,
      user.id,
      alertType,
    );
    if (existing) {
      this.logger.warn({ alertType, userId: user.id }, 'Alert already exists for user');
      return { alertId: existing.id, message: existing.message };
    }

    await this.validateAlertLimit(group.id, user.id);

    const message = ALERT_MESSAGES[alertType];
    const alert = await this.alertRepository.create({
      groupId: group.id,
      userId: user.id,
      type: alertType,
      message,
      isPending: true,
      startedAt: new Date(),
    });

    this.logger.info({ alertType, userId: user.id, groupId: group.id }, 'Alert started');
    return { alertId: alert.id, message: alert.message };
  }
}
