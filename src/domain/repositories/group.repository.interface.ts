import type { Group } from '../entities/group.entity.js';

export interface CreateGroupData {
  chatId: string;
  name: string;
  isActive?: boolean;
}

export interface UpdateGroupData {
  name?: string;
  isActive?: boolean;
}

export interface IGroupRepository {
  findById(id: string): Promise<Group | null>;
  findByChatId(chatId: string): Promise<Group | null>;
  findAll(): Promise<Group[]>;
  create(data: CreateGroupData): Promise<Group>;
  update(id: string, data: UpdateGroupData): Promise<Group>;
  delete(id: string): Promise<void>;
}
