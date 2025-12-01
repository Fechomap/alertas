import { DomainError } from '../errors/domain.error.js';

export class TelegramId {
  private constructor(private readonly value: bigint) {}

  static create(value: bigint | number | string): TelegramId {
    const bigIntValue = BigInt(value);

    if (bigIntValue <= 0) {
      throw new DomainError('Telegram ID must be a positive number');
    }

    return new TelegramId(bigIntValue);
  }

  getValue(): bigint {
    return this.value;
  }

  toString(): string {
    return this.value.toString();
  }

  equals(other: TelegramId): boolean {
    return this.value === other.value;
  }
}
