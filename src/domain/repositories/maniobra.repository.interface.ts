import type { Maniobra } from '../entities/maniobra.entity.js';

export interface CreateManiobraData {
  groupId: string;
  userId: string;
  cantidad: number;
  descripcion: string;
  fecha?: Date;
}

export interface ManiobraWithGroup {
  id: string;
  groupId: string;
  groupName: string;
  cantidad: number;
  fecha: Date;
}

export interface IManiobraRepository {
  findById(id: string): Promise<Maniobra | null>;
  findByGroup(groupId: string): Promise<Maniobra[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<Maniobra[]>;
  findByDateRangeWithGroup(startDate: Date, endDate: Date): Promise<ManiobraWithGroup[]>;
  create(data: CreateManiobraData): Promise<Maniobra>;
  delete(id: string): Promise<void>;
}
