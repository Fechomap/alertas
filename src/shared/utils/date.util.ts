import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import isoWeek from 'dayjs/plugin/isoWeek.js';
import 'dayjs/locale/es.js';

import { APP_CONSTANTS } from '../constants/app.constants.js';

// Configurar plugins y locale
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isoWeek);
dayjs.locale('es');

const TZ = APP_CONSTANTS.TIMEZONE;

export function nowMX(): dayjs.Dayjs {
  return dayjs().tz(TZ);
}

export function toMX(date: Date): dayjs.Dayjs {
  return dayjs(date).tz(TZ);
}

export function getWeekRange(): { start: Date; end: Date } {
  const now = nowMX();
  const start = now.startOf('isoWeek').utc().toDate();
  const end = now.endOf('isoWeek').utc().toDate();
  return { start, end };
}

/**
 * Get week range for a given offset from current week
 * @param offset 0 = current week, -1 = last week, -2 = two weeks ago, etc.
 */
export function getWeekRangeForOffset(offset: number): { start: Date; end: Date } {
  const now = nowMX().add(offset, 'week');
  const start = now.startOf('isoWeek').utc().toDate();
  const end = now.endOf('isoWeek').utc().toDate();
  return { start, end };
}

/**
 * Format week label for inline keyboard buttons
 * @param offset 0 = "Semana actual", negative = "DD mes - DD mes" format
 */
export function formatWeekLabel(offset: number): string {
  if (offset === 0) return 'Semana actual';
  const { start, end } = getWeekRangeForOffset(offset);
  const startDate = toMX(start);
  const endDate = toMX(end);
  return `${startDate.format('DD MMM')} - ${endDate.format('DD MMM')}`;
}

export function formatDate(date: Date, format = 'DD/MM/YYYY HH:mm'): string {
  return toMX(date).format(format);
}

export function formatDateRange(start: Date, end: Date): string {
  return `${formatDate(start, 'DD/MM/YYYY')} - ${formatDate(end, 'DD/MM/YYYY')}`;
}
