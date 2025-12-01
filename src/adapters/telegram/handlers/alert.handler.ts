import { randomUUID } from 'crypto';

import type { IReplyService } from '../../../application/ports/reply.service.interface.js';
import type { AlertType } from '../../../domain/value-objects/alert-type.vo.js';
import {
  ALERT_MESSAGES,
  CANCELLATION_MESSAGES,
} from '../../../domain/value-objects/alert-type.vo.js';
import { APP_CONSTANTS } from '../../../shared/constants/app.constants.js';
import { getMainKeyboardArray } from '../keyboards/main.keyboard.js';
import type { Logger } from '../../../infrastructure/logging/logger.js';

interface ActiveAlert {
  id: string;
  chatId: number;
  userId: number;
  userName: string;
  alertType: AlertType;
  interval: ReturnType<typeof setInterval>;
  message: string;
  startedAt: Date;
  messageCount: number;
}

export class AlertHandler {
  private readonly alertsById: Map<string, ActiveAlert> = new Map();
  private readonly alertIndex: Map<string, string> = new Map();
  private readonly groupLocks: Map<number, Promise<void>> = new Map();

  constructor(
    private readonly logger: Logger,
    private readonly replyService: IReplyService,
  ) {}

  private getIndexKey(chatId: number, alertType: AlertType): string {
    return `${chatId}:${alertType}`;
  }

  private async acquireGroupLock(chatId: number): Promise<() => void> {
    const existingLock = this.groupLocks.get(chatId);
    if (existingLock) {
      await existingLock;
    }

    let releaseLock: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    this.groupLocks.set(chatId, lockPromise);

    return () => {
      releaseLock!();
      this.groupLocks.delete(chatId);
    };
  }

  hasActiveAlert(chatId: number, alertType: AlertType): boolean {
    const indexKey = this.getIndexKey(chatId, alertType);
    const alertId = this.alertIndex.get(indexKey);

    if (!alertId) return false;
    return this.alertsById.has(alertId);
  }

  getActiveAlert(chatId: number, alertType: AlertType): ActiveAlert | null {
    const indexKey = this.getIndexKey(chatId, alertType);
    const alertId = this.alertIndex.get(indexKey);

    if (!alertId) return null;
    return this.alertsById.get(alertId) ?? null;
  }

  async startAlert(
    chatId: number,
    userId: number,
    userName: string,
    alertType: AlertType,
  ): Promise<{ success: boolean; alertId?: string; error?: string }> {
    const release = await this.acquireGroupLock(chatId);

    try {
      if (this.hasActiveAlert(chatId, alertType)) {
        const existingAlert = this.getActiveAlert(chatId, alertType);
        this.logger.warn({ alertType, chatId, alertId: existingAlert?.id }, 'Alert already active');
        return {
          success: false,
          error: `Ya existe una alerta de ${alertType} activa en este grupo`,
        };
      }

      const alertId = randomUUID();
      const indexKey = this.getIndexKey(chatId, alertType);
      const message = ALERT_MESSAGES[alertType];

      this.logger.info({ alertId, chatId, alertType, userId, userName }, 'Starting alert');

      await this.replyService.sendWithKeyboard(chatId, message, getMainKeyboardArray());

      const interval = setInterval(async () => {
        const alert = this.alertsById.get(alertId);

        if (!alert) {
          this.logger.warn({ alertId }, 'Orphan interval detected, clearing');
          clearInterval(interval);
          return;
        }

        try {
          await this.replyService.sendWithKeyboard(chatId, message, getMainKeyboardArray());
          alert.messageCount++;
          this.logger.debug({ alertId, chatId, messageCount: alert.messageCount }, 'Alert tick');
        } catch (error) {
          this.logger.error({ alertId, error }, 'Alert tick error');
          this.stopAlertById(alertId);
        }
      }, APP_CONSTANTS.LIMITS.ALERT_INTERVAL_MS);

      const activeAlert: ActiveAlert = {
        id: alertId,
        chatId,
        userId,
        userName,
        alertType,
        interval,
        message,
        startedAt: new Date(),
        messageCount: 1,
      };

      this.alertsById.set(alertId, activeAlert);
      this.alertIndex.set(indexKey, alertId);

      this.logger.info({ alertId, totalActive: this.alertsById.size }, 'Alert registered');

      return { success: true, alertId };
    } finally {
      release();
    }
  }

  private stopAlertById(alertId: string): boolean {
    const alert = this.alertsById.get(alertId);

    if (!alert) {
      this.logger.warn({ alertId }, 'Alert not found for stop');
      return false;
    }

    clearInterval(alert.interval);

    const indexKey = this.getIndexKey(alert.chatId, alert.alertType);
    this.alertIndex.delete(indexKey);
    this.alertsById.delete(alertId);

    const duration = Math.round((Date.now() - alert.startedAt.getTime()) / 1000);

    this.logger.info(
      {
        alertId,
        chatId: alert.chatId,
        alertType: alert.alertType,
        duration,
        messageCount: alert.messageCount,
        remaining: this.alertsById.size,
      },
      'Alert stopped',
    );

    return true;
  }

  async deactivateAlert(
    chatId: number,
    alertType: AlertType,
  ): Promise<{ success: boolean; alertId?: string; error?: string }> {
    const release = await this.acquireGroupLock(chatId);

    try {
      const alert = this.getActiveAlert(chatId, alertType);

      if (!alert) {
        this.logger.warn({ alertType, chatId }, 'No active alert to deactivate');

        await this.replyService.sendWithKeyboard(
          chatId,
          '🚫 *No hay una alerta activa para desactivar.*',
          getMainKeyboardArray(),
        );

        return { success: false, error: 'No hay alerta activa' };
      }

      const alertId = alert.id;
      const stopped = this.stopAlertById(alertId);

      if (stopped) {
        const cancellationMessage = CANCELLATION_MESSAGES[alertType];
        await this.replyService.sendWithKeyboard(
          chatId,
          cancellationMessage,
          getMainKeyboardArray(),
        );

        this.logger.info({ alertId, chatId, alertType }, 'Alert deactivated');

        return { success: true, alertId };
      }

      return { success: false, error: 'Error al detener la alerta' };
    } finally {
      release();
    }
  }

  async forceStopGroupAlerts(chatId: number): Promise<number> {
    const release = await this.acquireGroupLock(chatId);

    try {
      let stoppedCount = 0;

      for (const [alertId, alert] of this.alertsById.entries()) {
        if (alert.chatId === chatId) {
          this.stopAlertById(alertId);
          stoppedCount++;
        }
      }

      this.logger.info({ chatId, stoppedCount }, 'Force stopped group alerts');

      if (stoppedCount > 0) {
        await this.replyService.sendWithKeyboard(
          chatId,
          `🛑 *${stoppedCount} alerta(s) detenida(s) forzosamente.*`,
          getMainKeyboardArray(),
        );
      }

      return stoppedCount;
    } finally {
      release();
    }
  }

  forceStopAllAlerts(): number {
    const totalAlerts = this.alertsById.size;

    this.logger.info({ totalAlerts }, 'Force stopping all alerts');

    for (const [alertId, alert] of this.alertsById.entries()) {
      clearInterval(alert.interval);
      this.logger.info({ alertId, chatId: alert.chatId }, 'Force stopped');
    }

    this.alertsById.clear();
    this.alertIndex.clear();

    this.logger.info({ totalAlerts }, 'All alerts force stopped');

    return totalAlerts;
  }

  getActiveAlertsInfo(): Array<{
    id: string;
    chatId: number;
    alertType: AlertType;
    userName: string;
    startedAt: Date;
    messageCount: number;
    durationSeconds: number;
  }> {
    const now = Date.now();

    return Array.from(this.alertsById.values()).map((alert) => ({
      id: alert.id,
      chatId: alert.chatId,
      alertType: alert.alertType,
      userName: alert.userName,
      startedAt: alert.startedAt,
      messageCount: alert.messageCount,
      durationSeconds: Math.round((now - alert.startedAt.getTime()) / 1000),
    }));
  }

  getActiveAlertsCount(): number {
    return this.alertsById.size;
  }

  checkConsistency(): { isConsistent: boolean; issues: string[] } {
    const issues: string[] = [];

    for (const [indexKey, alertId] of this.alertIndex.entries()) {
      if (!this.alertsById.has(alertId)) {
        issues.push(`Index key ${indexKey} points to non-existent alert ${alertId}`);
      }
    }

    for (const [alertId, alert] of this.alertsById.entries()) {
      const indexKey = this.getIndexKey(alert.chatId, alert.alertType);
      if (this.alertIndex.get(indexKey) !== alertId) {
        issues.push(`Alert ${alertId} not properly indexed`);
      }
    }

    return {
      isConsistent: issues.length === 0,
      issues,
    };
  }
}
