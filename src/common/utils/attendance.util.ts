import { RecordType } from '@prisma/client';
import {
  diffMinutes,
  localDateKey,
  localTime,
  parseTimeToMinutes,
  todayKey,
  weekdayOf,
} from './time.util';

export interface ScheduleLike {
  startTime: string;
  endTime: string;
  breakMinutes: number;
  workdays: string;
  toleranceMinutes: number;
}

export interface RecordLike {
  id: string;
  type: RecordType;
  recordedAt: Date;
}

export interface SerializedTimeRecord {
  id: string;
  type: RecordType;
  recordedAt: string;
  localDate: string;
  localTime: string;
}

export type SerializedRecord<T extends RecordLike = RecordLike> = Omit<
  T,
  'recordedAt'
> & {
  recordedAt: string;
  localDate: string;
  localTime: string;
};

export type DayStatus =
  | 'COMPLETE'
  | 'INCOMPLETE'
  | 'IN_PROGRESS'
  | 'ABSENT'
  | 'DAY_OFF';

export interface DailySummary {
  date: string;
  weekday: number;
  workday: boolean;
  status: DayStatus;
  expectedMinutes: number;
  workedMinutes: number;
  breakMinutes: number;
  overtimeMinutes: number;
  missingMinutes: number;
  lateMinutes: number;
  balanceMinutes: number;
  firstIn: string | null;
  lastOut: string | null;
  openSince: string | null;
  records: SerializedTimeRecord[];
}

export const DEFAULT_SCHEDULE: ScheduleLike = {
  startTime: '08:00',
  endTime: '17:00',
  breakMinutes: 60,
  workdays: '1,2,3,4,5',
  toleranceMinutes: 10,
};

const START_TYPES = new Set<RecordType>(['CLOCK_IN', 'BREAK_END']);
const BREAK_START: RecordType = 'BREAK_START';
const BREAK_END: RecordType = 'BREAK_END';
const CLOCK_IN: RecordType = 'CLOCK_IN';
const CLOCK_OUT: RecordType = 'CLOCK_OUT';

export function serializeRecord<T extends RecordLike>(
  record: T,
): SerializedRecord<T> {
  return {
    ...record,
    recordedAt: record.recordedAt.toISOString(),
    localDate: localDateKey(record.recordedAt),
    localTime: localTime(record.recordedAt),
  };
}

export function isWorkday(schedule: ScheduleLike, weekday: number): boolean {
  return schedule.workdays
    .split(',')
    .map((value) => Number(value.trim()))
    .includes(weekday);
}

export function expectedMinutesForDay(
  schedule: ScheduleLike,
  weekday: number,
): number {
  if (!isWorkday(schedule, weekday)) {
    return 0;
  }
  const start = parseTimeToMinutes(schedule.startTime);
  const end = parseTimeToMinutes(schedule.endTime);
  return Math.max(0, end - start - schedule.breakMinutes);
}

export function computeDaySummary(
  date: string,
  records: RecordLike[],
  schedule: ScheduleLike = DEFAULT_SCHEDULE,
  options: { includeOngoing?: boolean; now?: Date } = {},
): DailySummary {
  const weekday = weekdayOf(date);
  const workday = isWorkday(schedule, weekday);
  const expectedMinutes = expectedMinutesForDay(schedule, weekday);
  const sorted = [...records].sort(
    (left, right) => left.recordedAt.getTime() - right.recordedAt.getTime(),
  );

  let workedMinutes = 0;
  let breakMinutes = 0;
  let openStart: RecordLike | null = null;
  let openBreak: RecordLike | null = null;
  let inconsistent = false;

  for (const record of sorted) {
    if (START_TYPES.has(record.type)) {
      if (openStart) {
        inconsistent = true;
        workedMinutes += diffMinutes(openStart.recordedAt, record.recordedAt);
      }
      if (openBreak) {
        breakMinutes += diffMinutes(openBreak.recordedAt, record.recordedAt);
        openBreak = null;
      }
      openStart = record;
      continue;
    }

    if (record.type === BREAK_START) {
      if (openStart) {
        workedMinutes += diffMinutes(openStart.recordedAt, record.recordedAt);
        openStart = null;
      }
      if (openBreak) {
        breakMinutes += diffMinutes(openBreak.recordedAt, record.recordedAt);
        inconsistent = true;
      }
      openBreak = record;
      continue;
    }

    if (record.type === CLOCK_OUT) {
      if (openStart) {
        workedMinutes += diffMinutes(openStart.recordedAt, record.recordedAt);
        openStart = null;
      }
      if (openBreak) {
        breakMinutes += diffMinutes(openBreak.recordedAt, record.recordedAt);
        openBreak = null;
      }
    }
  }

  const openRecord = openStart ?? openBreak;
  const isToday = date === todayKey();
  const includeOngoing = Boolean(options.includeOngoing) && isToday;

  if (openRecord && includeOngoing) {
    const referenceTime = options.now ?? new Date();
    if (openStart) {
      workedMinutes += diffMinutes(openStart.recordedAt, referenceTime);
    } else if (openBreak) {
      breakMinutes += diffMinutes(openBreak.recordedAt, referenceTime);
    }
  }

  const firstIn =
    sorted.find((record) => record.type === CLOCK_IN) ?? null;
  const lastOut = [...sorted]
    .reverse()
    .find((record) => record.type === CLOCK_OUT);

  let lateMinutes = 0;
  if (workday && firstIn) {
    const expectedStart =
      parseTimeToMinutes(schedule.startTime) + schedule.toleranceMinutes;
    const actualStart = parseTimeToMinutes(localTime(firstIn.recordedAt));
    lateMinutes = Math.max(0, actualStart - expectedStart);
  }

  const overtimeMinutes = Math.max(0, workedMinutes - expectedMinutes);
  const missingMinutes = workday
    ? Math.max(0, expectedMinutes - workedMinutes)
    : 0;

  let status: DayStatus;
  if (sorted.length === 0) {
    status = workday ? 'ABSENT' : 'DAY_OFF';
  } else if (openRecord || inconsistent) {
    status = isToday ? 'IN_PROGRESS' : 'INCOMPLETE';
  } else {
    status = 'COMPLETE';
  }

  return {
    date,
    weekday,
    workday,
    status,
    expectedMinutes,
    workedMinutes,
    breakMinutes,
    overtimeMinutes,
    missingMinutes,
    lateMinutes,
    balanceMinutes: workedMinutes - expectedMinutes,
    firstIn: firstIn ? localTime(firstIn.recordedAt) : null,
    lastOut: lastOut ? localTime(lastOut.recordedAt) : null,
    openSince: openRecord ? localTime(openRecord.recordedAt) : null,
    records: sorted.map((record) => serializeRecord(record)),
  };
}

export interface RangeTotals {
  expectedMinutes: number;
  workedMinutes: number;
  breakMinutes: number;
  overtimeMinutes: number;
  missingMinutes: number;
  lateMinutes: number;
  balanceMinutes: number;
  daysWorked: number;
  absences: number;
  incompleteDays: number;
}

export interface RangeSummary {
  days: DailySummary[];
  totals: RangeTotals;
}

export function buildRangeSummary(
  dates: string[],
  records: RecordLike[],
  schedule: ScheduleLike = DEFAULT_SCHEDULE,
  options: {
    includeOngoing?: boolean;
    includeEmptyDays?: boolean;
    now?: Date;
  } = {},
): RangeSummary {
  const recordsByDate = new Map<string, RecordLike[]>();

  for (const record of records) {
    const date = localDateKey(record.recordedAt);
    const list = recordsByDate.get(date) ?? [];
    list.push(record);
    recordsByDate.set(date, list);
  }

  const days = dates
    .map((date) =>
      computeDaySummary(date, recordsByDate.get(date) ?? [], schedule, options),
    )
    .filter(
      (day) =>
        options.includeEmptyDays || day.workday || day.records.length > 0,
    );

  const totals = days.reduce<RangeTotals>(
    (accumulator, day) => ({
      expectedMinutes: accumulator.expectedMinutes + day.expectedMinutes,
      workedMinutes: accumulator.workedMinutes + day.workedMinutes,
      breakMinutes: accumulator.breakMinutes + day.breakMinutes,
      overtimeMinutes: accumulator.overtimeMinutes + day.overtimeMinutes,
      missingMinutes: accumulator.missingMinutes + day.missingMinutes,
      lateMinutes: accumulator.lateMinutes + day.lateMinutes,
      balanceMinutes: accumulator.balanceMinutes + day.balanceMinutes,
      daysWorked: accumulator.daysWorked + (day.workedMinutes > 0 ? 1 : 0),
      absences: accumulator.absences + (day.status === 'ABSENT' ? 1 : 0),
      incompleteDays:
        accumulator.incompleteDays +
        (day.status === 'INCOMPLETE' || day.status === 'IN_PROGRESS' ? 1 : 0),
    }),
    {
      expectedMinutes: 0,
      workedMinutes: 0,
      breakMinutes: 0,
      overtimeMinutes: 0,
      missingMinutes: 0,
      lateMinutes: 0,
      balanceMinutes: 0,
      daysWorked: 0,
      absences: 0,
      incompleteDays: 0,
    },
  );

  return { days, totals };
}

export function getNextRecordType(
  records: RecordLike[],
  schedule: ScheduleLike = DEFAULT_SCHEDULE,
): RecordType {
  const last = records.at(-1);

  if (!last || last.type === CLOCK_OUT) {
    return CLOCK_IN;
  }

  if (schedule.breakMinutes <= 0) {
    if (last.type === CLOCK_IN) {
      return CLOCK_OUT;
    }
    if (last.type === BREAK_START) {
      return BREAK_END;
    }
    return CLOCK_OUT;
  }

  switch (last.type) {
    case CLOCK_IN:
      return BREAK_START;
    case BREAK_START:
      return BREAK_END;
    case BREAK_END:
      return CLOCK_OUT;
    default:
      return CLOCK_IN;
  }
}

export function isValidTransition(
  currentType: RecordType | undefined,
  nextType: RecordType,
  breakEnabled: boolean,
): boolean {
  if (!currentType || currentType === CLOCK_OUT) {
    return nextType === CLOCK_IN;
  }

  if (!breakEnabled) {
    return (
      (currentType === CLOCK_IN && nextType === CLOCK_OUT) ||
      (currentType === BREAK_START && nextType === BREAK_END) ||
      nextType === CLOCK_OUT
    );
  }

  switch (currentType) {
    case CLOCK_IN:
      return nextType === BREAK_START || nextType === CLOCK_OUT;
    case BREAK_START:
      return nextType === BREAK_END;
    case BREAK_END:
      return nextType === CLOCK_OUT;
    default:
      return nextType === CLOCK_IN;
  }
}

export const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  CLOCK_IN: 'Entrada',
  BREAK_START: 'Início do intervalo',
  BREAK_END: 'Fim do intervalo',
  CLOCK_OUT: 'Saída',
};
