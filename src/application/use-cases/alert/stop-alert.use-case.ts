import type { IUseCase } from '../../interfaces/use-case.interface.js';
import type { IAlertRepository } from '../../../domain/repositories/alert.repository.interface.js';
import type { IGroupRepository } from '../../../domain/repositories/group.repository.interface.js';
import type { AlertType } from '../../../domain/value-objects/alert-type.vo.js';
import { CANCELLATION_MESSAGES } from '../../../domain/value-objects/alert-type.vo.js';
import type { Logger } from '../../../infrastructure/logging/logger.js';

export interface StopAlertInput {
  chatId: string;
  alertType: AlertType;
}

export interface StopAlertOutput {
  stoppedCount: number;
  message: string;
}

export class StopAlertUseCase implements IUseCase<StopAlertInput, StopAlertOutput> {
  constructor(
    private readonly alertRepository: IAlertRepository,
    private readonly groupRepository: IGroupRepository,
    private readonly logger: Logger,
  ) {}

  async execute(input: StopAlertInput): Promise<StopAlertOutput> {
    const { chatId, alertType } = input;

    // 1. Obtener grupo
    const group = await this.groupRepository.findByChatId(chatId);
    if (!group) {
      return {
        stoppedCount: 0,
        message: '🚫 *No se encontro una alerta activa de este tipo para cancelar.*',
      };
    }

    // 2. Obtener alertas activas del tipo
    const activeAlerts = await this.alertRepository.findActiveByGroup(group.id);
    const alertsOfType = activeAlerts.filter((a) => a.type === alertType);

    if (alertsOfType.length === 0) {
      return {
        stoppedCount: 0,
        message: '🚫 *No se encontro una alerta activa de este tipo para cancelar.*',
      };
    }

    // 3. Detener todas las alertas del tipo
    let stoppedCount = 0;
    for (const alert of alertsOfType) {
      await this.alertRepository.update(alert.id, { stoppedAt: new Date() });
      stoppedCount++;
    }

    const baseMessage = CANCELLATION_MESSAGES[alertType];
    const countSuffix = stoppedCount > 1 ? `\n\n_(${stoppedCount} alertas canceladas)_` : '';

    this.logger.info({ alertType, groupId: group.id, stoppedCount }, 'Alerts stopped');

    return {
      stoppedCount,
      message: baseMessage + countSuffix,
    };
  }
}
