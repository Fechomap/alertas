import { DomainError } from './domain.error.js';

export class AlertNotFoundError extends DomainError {
  constructor(identifier: string) {
    super(`Alert not found: ${identifier}`);
    this.name = 'AlertNotFoundError';
  }
}
