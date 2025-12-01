import { DomainError } from './domain.error.js';

export class AlertLimitExceededError extends DomainError {
  constructor(userId: string, limit: number) {
    super(`User ${userId} has reached the alert limit of ${limit}`);
    this.name = 'AlertLimitExceededError';
  }
}
