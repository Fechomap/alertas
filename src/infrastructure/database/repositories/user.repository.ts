import type { PrismaClient, User as PrismaUser, UserRole as PrismaUserRole } from '@prisma/client';

import { User } from '../../../domain/entities/user.entity.js';
import type { UserProps } from '../../../domain/entities/user.entity.js';
import type {
  IUserRepository,
  CreateUserData,
  UpdateUserData,
} from '../../../domain/repositories/user.repository.interface.js';
import { UserRole } from '../../../domain/value-objects/user-role.vo.js';

export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapToDomain(prismaUser: PrismaUser): User {
    const props: UserProps = {
      id: prismaUser.id,
      telegramId: prismaUser.telegramId,
      username: prismaUser.username,
      firstName: prismaUser.firstName,
      lastName: prismaUser.lastName,
      role: prismaUser.role as UserRole,
      isActive: prismaUser.isActive,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
    };
    return User.create(props);
  }

  private mapRole(role: UserRole): PrismaUserRole {
    return role as PrismaUserRole;
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.mapToDomain(user) : null;
  }

  async findByTelegramId(telegramId: bigint): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { telegramId } });
    return user ? this.mapToDomain(user) : null;
  }

  async findAll(): Promise<User[]> {
    const users = await this.prisma.user.findMany();
    return users.map((u) => this.mapToDomain(u));
  }

  async create(data: CreateUserData): Promise<User> {
    const user = await this.prisma.user.create({
      data: {
        telegramId: data.telegramId,
        username: data.username ?? null,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        role: this.mapRole(data.role ?? UserRole.USER),
        isActive: data.isActive ?? true,
      },
    });
    return this.mapToDomain(user);
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    const updateData: Record<string, unknown> = {};
    if (data.username !== undefined) updateData.username = data.username;
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.role !== undefined) updateData.role = this.mapRole(data.role);
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });
    return this.mapToDomain(user);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}
