import type {
  PrismaClient,
  Alert as PrismaAlert,
  AlertType as PrismaAlertType,
} from '@prisma/client';

import { Alert } from '../../../domain/entities/alert.entity.js';
import type { AlertProps } from '../../../domain/entities/alert.entity.js';
import type {
  IAlertRepository,
  CreateAlertData,
  UpdateAlertData,
} from '../../../domain/repositories/alert.repository.interface.js';
import type { AlertType } from '../../../domain/value-objects/alert-type.vo.js';

export class AlertRepository implements IAlertRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapToDomain(prismaAlert: PrismaAlert): Alert {
    const props: AlertProps = {
      id: prismaAlert.id,
      groupId: prismaAlert.groupId,
      userId: prismaAlert.userId,
      type: prismaAlert.type as AlertType,
      message: prismaAlert.message,
      isPending: prismaAlert.isPending,
      startedAt: prismaAlert.startedAt,
      stoppedAt: prismaAlert.stoppedAt,
      createdAt: prismaAlert.createdAt,
    };
    return Alert.create(props);
  }

  private mapType(type: AlertType): PrismaAlertType {
    return type as PrismaAlertType;
  }

  async findById(id: string): Promise<Alert | null> {
    const alert = await this.prisma.alert.findUnique({ where: { id } });
    return alert ? this.mapToDomain(alert) : null;
  }

  async findByGroupAndUserAndType(
    groupId: string,
    userId: string,
    type: AlertType,
  ): Promise<Alert | null> {
    const alert = await this.prisma.alert.findUnique({
      where: {
        groupId_userId_type: {
          groupId,
          userId,
          type: this.mapType(type),
        },
      },
    });
    return alert ? this.mapToDomain(alert) : null;
  }

  async findActiveByGroup(groupId: string): Promise<Alert[]> {
    const alerts = await this.prisma.alert.findMany({
      where: { groupId, stoppedAt: null },
    });
    return alerts.map((a) => this.mapToDomain(a));
  }

  async findActiveByUser(userId: string): Promise<Alert[]> {
    const alerts = await this.prisma.alert.findMany({
      where: { userId, stoppedAt: null },
    });
    return alerts.map((a) => this.mapToDomain(a));
  }

  async countActiveByGroupAndUser(groupId: string, userId: string): Promise<number> {
    return this.prisma.alert.count({
      where: { groupId, userId, stoppedAt: null },
    });
  }

  async create(data: CreateAlertData): Promise<Alert> {
    const alert = await this.prisma.alert.create({
      data: {
        groupId: data.groupId,
        userId: data.userId,
        type: this.mapType(data.type),
        message: data.message,
        isPending: data.isPending ?? true,
        startedAt: data.startedAt ?? new Date(),
      },
    });
    return this.mapToDomain(alert);
  }

  async update(id: string, data: UpdateAlertData): Promise<Alert> {
    const updateData: Record<string, unknown> = {};
    if (data.isPending !== undefined) updateData.isPending = data.isPending;
    if (data.stoppedAt !== undefined) updateData.stoppedAt = data.stoppedAt;

    const alert = await this.prisma.alert.update({
      where: { id },
      data: updateData,
    });
    return this.mapToDomain(alert);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.alert.delete({ where: { id } });
  }

  async deleteAllByGroup(groupId: string): Promise<void> {
    await this.prisma.alert.deleteMany({ where: { groupId } });
  }
}
