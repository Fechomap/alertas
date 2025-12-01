import type { Alert } from '../entities/alert.entity.js';
import type { AlertType } from '../value-objects/alert-type.vo.js';

export interface CreateAlertData {
  groupId: string;
  userId: string;
  type: AlertType;
  message: string;
  isPending?: boolean;
  startedAt?: Date;
}

export interface UpdateAlertData {
  isPending?: boolean;
  stoppedAt?: Date | null;
}

export interface IAlertRepository {
  findById(id: string): Promise<Alert | null>;
  findByGroupAndUserAndType(
    groupId: string,
    userId: string,
    type: AlertType,
  ): Promise<Alert | null>;
  findActiveByGroup(groupId: string): Promise<Alert[]>;
  findActiveByUser(userId: string): Promise<Alert[]>;
  countActiveByGroupAndUser(groupId: string, userId: string): Promise<number>;
  create(data: CreateAlertData): Promise<Alert>;
  update(id: string, data: UpdateAlertData): Promise<Alert>;
  delete(id: string): Promise<void>;
  deleteAllByGroup(groupId: string): Promise<void>;
}
