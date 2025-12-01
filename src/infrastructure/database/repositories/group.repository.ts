import type { PrismaClient, Group as PrismaGroup } from '@prisma/client';

import { Group } from '../../../domain/entities/group.entity.js';
import type { GroupProps } from '../../../domain/entities/group.entity.js';
import type {
  IGroupRepository,
  CreateGroupData,
  UpdateGroupData,
} from '../../../domain/repositories/group.repository.interface.js';

export class GroupRepository implements IGroupRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapToDomain(prismaGroup: PrismaGroup): Group {
    const props: GroupProps = {
      id: prismaGroup.id,
      chatId: prismaGroup.chatId,
      name: prismaGroup.name,
      isActive: prismaGroup.isActive,
      createdAt: prismaGroup.createdAt,
      updatedAt: prismaGroup.updatedAt,
    };
    return Group.create(props);
  }

  async findById(id: string): Promise<Group | null> {
    const group = await this.prisma.group.findUnique({ where: { id } });
    return group ? this.mapToDomain(group) : null;
  }

  async findByChatId(chatId: string): Promise<Group | null> {
    const group = await this.prisma.group.findUnique({ where: { chatId } });
    return group ? this.mapToDomain(group) : null;
  }

  async findAll(): Promise<Group[]> {
    const groups = await this.prisma.group.findMany();
    return groups.map((g) => this.mapToDomain(g));
  }

  async create(data: CreateGroupData): Promise<Group> {
    const group = await this.prisma.group.create({
      data: {
        chatId: data.chatId,
        name: data.name,
        isActive: data.isActive ?? true,
      },
    });
    return this.mapToDomain(group);
  }

  async update(id: string, data: UpdateGroupData): Promise<Group> {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const group = await this.prisma.group.update({
      where: { id },
      data: updateData,
    });
    return this.mapToDomain(group);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.group.delete({ where: { id } });
  }
}
