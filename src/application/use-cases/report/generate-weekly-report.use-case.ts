import ExcelJS from 'exceljs';

import type { IUseCase } from '../../interfaces/use-case.interface.js';
import type {
  IManiobraRepository,
  ManiobraWithGroup,
} from '../../../domain/repositories/maniobra.repository.interface.js';
import {
  getWeekRangeForOffset,
  formatDateRange,
  nowMX,
  toMX,
} from '../../../shared/utils/date.util.js';
import type { Logger } from '../../../infrastructure/logging/logger.js';

export interface GenerateWeeklyReportInput {
  startDate?: Date;
  endDate?: Date;
}

export interface GenerateWeeklyReportOutput {
  buffer: Buffer;
  fileName: string;
  caption: string;
  recordCount: number;
}

interface DayCount {
  days: [number, number, number, number, number, number, number]; // Index 0 = Monday, 6 = Sunday
  total: number;
}

type GroupDayData = Map<string, DayCount>;

export class GenerateWeeklyReportUseCase
  implements IUseCase<GenerateWeeklyReportInput, GenerateWeeklyReportOutput>
{
  constructor(
    private readonly maniobraRepository: IManiobraRepository,
    private readonly logger: Logger,
  ) {}

  private aggregateByGroupAndDay(maniobras: ManiobraWithGroup[]): GroupDayData {
    const result: GroupDayData = new Map();

    for (const m of maniobras) {
      if (!result.has(m.groupName)) {
        result.set(m.groupName, {
          days: [0, 0, 0, 0, 0, 0, 0],
          total: 0,
        });
      }

      const groupData = result.get(m.groupName)!;
      // Get day of week (1=Monday to 7=Sunday in isoWeekday)
      const dayIndex = (toMX(m.fecha).isoWeekday() - 1) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
      groupData.days[dayIndex] += m.cantidad;
      groupData.total += m.cantidad;
    }

    return result;
  }

  private createWorksheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet {
    const ws = workbook.addWorksheet('Maniobras por Semana');

    ws.columns = [
      { header: 'Grupo', key: 'grupo', width: 25 },
      { header: 'Lunes', key: 'lunes', width: 12 },
      { header: 'Martes', key: 'martes', width: 12 },
      { header: 'Miércoles', key: 'miercoles', width: 12 },
      { header: 'Jueves', key: 'jueves', width: 12 },
      { header: 'Viernes', key: 'viernes', width: 12 },
      { header: 'Sábado', key: 'sabado', width: 12 },
      { header: 'Domingo', key: 'domingo', width: 12 },
      { header: 'Total', key: 'total', width: 12 },
    ];

    // Style header row
    const header = ws.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    header.alignment = { horizontal: 'center' };

    return ws;
  }

  private addRows(ws: ExcelJS.Worksheet, data: GroupDayData): number {
    const sortedGroups = [...data.keys()].sort();
    let totalManiobras = 0;
    const totals: [number, number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0, 0];

    for (const groupName of sortedGroups) {
      const groupData = data.get(groupName)!;
      ws.addRow({
        grupo: groupName,
        lunes: groupData.days[0],
        martes: groupData.days[1],
        miercoles: groupData.days[2],
        jueves: groupData.days[3],
        viernes: groupData.days[4],
        sabado: groupData.days[5],
        domingo: groupData.days[6],
        total: groupData.total,
      });
      totalManiobras += groupData.total;

      // Accumulate totals
      totals[0] += groupData.days[0];
      totals[1] += groupData.days[1];
      totals[2] += groupData.days[2];
      totals[3] += groupData.days[3];
      totals[4] += groupData.days[4];
      totals[5] += groupData.days[5];
      totals[6] += groupData.days[6];
    }

    // Add totals row
    const totalsRow = ws.addRow({
      grupo: 'TOTAL',
      lunes: totals[0],
      martes: totals[1],
      miercoles: totals[2],
      jueves: totals[3],
      viernes: totals[4],
      sabado: totals[5],
      domingo: totals[6],
      total: totalManiobras,
    });
    totalsRow.font = { bold: true };
    totalsRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };

    return totalManiobras;
  }

  async execute(input: GenerateWeeklyReportInput): Promise<GenerateWeeklyReportOutput> {
    const { start, end } =
      input.startDate && input.endDate
        ? { start: input.startDate, end: input.endDate }
        : getWeekRangeForOffset(0);

    this.logger.info({ start: start.toISOString(), end: end.toISOString() }, 'Generating report');

    const maniobras = await this.maniobraRepository.findByDateRangeWithGroup(start, end);
    this.logger.info({ count: maniobras.length }, 'Found maniobras for report');

    const aggregatedData = this.aggregateByGroupAndDay(maniobras);

    const workbook = new ExcelJS.Workbook();
    const ws = this.createWorksheet(workbook);
    const totalManiobras = this.addRows(ws, aggregatedData);

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const fileName = `reporte_semanal_${nowMX().format('YYYY-MM-DD')}.xlsx`;

    // Build caption with group totals
    let caption = `📊 *Reporte Semanal*\n📅 ${formatDateRange(start, end)}\n\n`;
    const sortedGroups = [...aggregatedData.keys()].sort();
    for (const groupName of sortedGroups) {
      const groupData = aggregatedData.get(groupName)!;
      caption += `${groupName}: ${groupData.total}\n`;
    }

    return { buffer, fileName, caption, recordCount: totalManiobras };
  }
}
