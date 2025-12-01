import { UserRole } from '../value-objects/user-role.vo.js';

export interface UserProps {
  id: string;
  telegramId: bigint;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  private constructor(private readonly props: UserProps) {}

  static create(props: UserProps): User {
    return new User(props);
  }

  get id(): string {
    return this.props.id;
  }

  get telegramId(): bigint {
    return this.props.telegramId;
  }

  get username(): string | null {
    return this.props.username;
  }

  get firstName(): string | null {
    return this.props.firstName;
  }

  get lastName(): string | null {
    return this.props.lastName;
  }

  get role(): UserRole {
    return this.props.role;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get displayName(): string {
    if (this.props.firstName) {
      return this.props.lastName
        ? `${this.props.firstName} ${this.props.lastName}`
        : this.props.firstName;
    }
    return this.props.username ?? `User ${this.props.telegramId}`;
  }

  isAlertManager(): boolean {
    return this.props.role === UserRole.ALERT_MANAGER || this.props.role === UserRole.ADMIN;
  }

  isOperator(): boolean {
    return (
      this.props.role === UserRole.OPERATOR ||
      this.props.role === UserRole.ALERT_MANAGER ||
      this.props.role === UserRole.ADMIN
    );
  }

  isAdmin(): boolean {
    return this.props.role === UserRole.ADMIN;
  }
}
