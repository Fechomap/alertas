import type { PrismaClient, Maniobra as PrismaManiobra } from '@prisma/client';

import { Maniobra } from '../../../domain/entities/maniobra.entity.js';
import type { ManiobraProps } from '../../../domain/entities/maniobra.entity.js';
import type {
  IManiobraRepository,
  CreateManiobraData,
  ManiobraWithGroup,
} from '../../../domain/repositories/maniobra.repository.interface.js';

export class ManiobraRepository implements IManiobraRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapToDomain(prismaManiobra: PrismaManiobra): Maniobra {
    const props: ManiobraProps = {
      id: prismaManiobra.id,
      groupId: prismaManiobra.groupId,
      userId: prismaManiobra.userId,
      cantidad: prismaManiobra.cantidad,
      descripcion: prismaManiobra.descripcion,
      fecha: prismaManiobra.fecha,
      createdAt: prismaManiobra.createdAt,
    };
    return Maniobra.create(props);
  }

  async findById(id: string): Promise<Maniobra | null> {
    const maniobra = await this.prisma.maniobra.findUnique({ where: { id } });
    return maniobra ? this.mapToDomain(maniobra) : null;
  }

  async findByGroup(groupId: string): Promise<Maniobra[]> {
    const maniobras = await this.prisma.maniobra.findMany({
      where: { groupId },
      orderBy: { fecha: 'desc' },
    });
    return maniobras.map((m) => this.mapToDomain(m));
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Maniobra[]> {
    const maniobras = await this.prisma.maniobra.findMany({
      where: {
        fecha: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { fecha: 'asc' },
    });
    return maniobras.map((m) => this.mapToDomain(m));
  }

  async findByDateRangeWithGroup(startDate: Date, endDate: Date): Promise<ManiobraWithGroup[]> {
    const maniobras = await this.prisma.maniobra.findMany({
      where: {
        fecha: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        group: true,
      },
      orderBy: { fecha: 'asc' },
    });
    return maniobras.map((m) => ({
      id: m.id,
      groupId: m.groupId,
      groupName: m.group.name,
      cantidad: m.cantidad,
      fecha: m.fecha,
    }));
  }

  async create(data: CreateManiobraData): Promise<Maniobra> {
    const maniobra = await this.prisma.maniobra.create({
      data: {
        groupId: data.groupId,
        userId: data.userId,
        cantidad: data.cantidad,
        descripcion: data.descripcion,
        fecha: data.fecha ?? new Date(),
      },
    });
    return this.mapToDomain(maniobra);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.maniobra.delete({ where: { id } });
  }
}
