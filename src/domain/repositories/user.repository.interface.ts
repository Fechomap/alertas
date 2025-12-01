import type { User } from '../entities/user.entity.js';
import type { UserRole } from '../value-objects/user-role.vo.js';

export interface CreateUserData {
  telegramId: bigint;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  role?: UserRole;
  isActive?: boolean;
}

export interface UpdateUserData {
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  role?: UserRole;
  isActive?: boolean;
}

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByTelegramId(telegramId: bigint): Promise<User | null>;
  findAll(): Promise<User[]>;
  create(data: CreateUserData): Promise<User>;
  update(id: string, data: UpdateUserData): Promise<User>;
  delete(id: string): Promise<void>;
}
