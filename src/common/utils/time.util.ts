import dayjs, { Dayjs } from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

export const DATE_FORMAT = 'YYYY-MM-DD';
export const MONTH_FORMAT = 'YYYY-MM';

export function getTimezone(): string {
  return process.env.APP_TIMEZONE || 'America/Sao_Paulo';
}

export function nowInTimezone(): Dayjs {
  return dayjs().tz(getTimezone());
}

export function parseDate(date: string): Dayjs {
  return dayjs.tz(date, getTimezone());
}

export function dayBounds(date?: string): {
  date: string;
  start: Date;
  end: Date;
} {
  const base = date ? parseDate(date) : nowInTimezone();
  return {
    date: base.format(DATE_FORMAT),
    start: base.startOf('day').toDate(),
    end: base.endOf('day').toDate(),
  };
}

export function monthBounds(month?: string): {
  month: string;
  start: Date;
  end: Date;
  firstDay: string;
  lastDay: string;
  days: number;
} {
  const base = month
    ? dayjs.tz(`${month}-01`, getTimezone())
    : nowInTimezone();
  const start = base.startOf('month');
  const end = base.endOf('month');
  return {
    month: start.format(MONTH_FORMAT),
    start: start.toDate(),
    end: end.toDate(),
    firstDay: start.format(DATE_FORMAT),
    lastDay: end.format(DATE_FORMAT),
    days: end.date(),
  };
}

export function formatLocal(
  date: Date | string,
  format = DATE_FORMAT,
): string {
  return dayjs(date).tz(getTimezone()).format(format);
}

export function localDateKey(date: Date | string): string {
  return formatLocal(date, DATE_FORMAT);
}

export function localTime(date: Date | string): string {
  return formatLocal(date, 'HH:mm');
}

export function weekdayOf(date: string): number {
  return parseDate(date).day();
}

export function eachDate(from: string, to: string): string[] {
  const dates: string[] = [];
  let current = parseDate(from).startOf('day');
  const end = parseDate(to).startOf('day');

  while (current.isBefore(end) || current.isSame(end)) {
    dates.push(current.format(DATE_FORMAT));
    current = current.add(1, 'day');
  }

  return dates;
}

export function daysBetween(from: string, to: string): number {
  return Math.abs(parseDate(to).diff(parseDate(from), 'day'));
}

export function parseDateTimeInput(value: string): Date {
  const hasTimezone = /(Z|[+-]\d{2}:?\d{2})$/i.test(value);
  if (hasTimezone) {
    return new Date(value);
  }
  return dayjs.tz(value, getTimezone()).toDate();
}

export function todayKey(): string {
  return nowInTimezone().format(DATE_FORMAT);
}

export function currentMonthKey(): string {
  return nowInTimezone().format(MONTH_FORMAT);
}

export function parseTimeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function diffMinutes(
  start: Date | string,
  end: Date | string,
): number {
  return Math.max(0, Math.round(dayjs(end).diff(dayjs(start), 'minute', true)));
}

export function humanDuration(totalMinutes: number): string {
  const sign = totalMinutes < 0 ? '-' : '';
  const absolute = Math.abs(totalMinutes);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  return `${sign}${hours}h ${String(minutes).padStart(2, '0')}min`;
}

export function minutesToClock(totalMinutes: number): string {
  const sign = totalMinutes < 0 ? '-' : '';
  const absolute = Math.abs(Math.round(totalMinutes));
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
