import { Injectable } from '@nestjs/common';
import { Prisma, RecordType } from '@prisma/client';
import {
  DEFAULT_SCHEDULE,
  buildRangeSummary,
  RangeTotals,
  serializeRecord,
} from '../common/utils/attendance.util';
import {
  eachDate,
  localDateKey,
  monthBounds,
  minutesToClock,
  nowInTimezone,
  todayKey,
} from '../common/utils/time.util';
import { toCsv } from '../common/utils/csv.util';
import { PrismaService } from '../prisma/prisma.service';
import { TimeRecordsService } from '../time-records/time-records.service';

const reportUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  registration: true,
  department: true,
  position: true,
  active: true,
  schedule: {
    select: {
      startTime: true,
      endTime: true,
      breakMinutes: true,
      workdays: true,
      toleranceMinutes: true,
    },
  },
} satisfies Prisma.UserSelect;

const WEEKDAY_LABELS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

const STATUS_LABELS: Record<string, string> = {
  COMPLETE: 'Completo',
  INCOMPLETE: 'Incompleto',
  IN_PROGRESS: 'Em andamento',
  ABSENT: 'Ausente',
  DAY_OFF: 'Folga',
};

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeRecords: TimeRecordsService,
  ) {}

  async monthly(userId: string, month?: string) {
    const bounds = monthBounds(month);
    const summary = await this.timeRecords.getSummary(
      userId,
      bounds.firstDay,
      bounds.lastDay,
    );

    return {
      month: bounds.month,
      ...summary,
    };
  }

  async daily(userId: string, date?: string) {
    const targetDate = date ?? todayKey();
    return this.timeRecords.getSummary(
      userId,
      targetDate,
      targetDate,
      true,
      true,
    );
  }

  async team(month?: string, department?: string) {
    const bounds = monthBounds(month);
    const dates = eachDate(bounds.firstDay, bounds.lastDay);

    const users = await this.prisma.user.findMany({
      where: {
        active: true,
        ...(department ? { department: { contains: department } } : {}),
      },
      select: reportUserSelect,
      orderBy: { name: 'asc' },
    });

    const userIds = users.map((user) => user.id);
    const records = userIds.length
      ? await this.prisma.timeRecord.findMany({
          where: {
            userId: { in: userIds },
            recordedAt: { gte: bounds.start, lte: bounds.end },
            voided: false,
          },
          orderBy: { recordedAt: 'asc' },
        })
      : [];

    const recordsByUser = new Map<string, typeof records>();
    for (const record of records) {
      const list = recordsByUser.get(record.userId) ?? [];
      list.push(record);
      recordsByUser.set(record.userId, list);
    }

    const employees = users.map((user) => {
      const summary = buildRangeSummary(
        dates,
        recordsByUser.get(user.id) ?? [],
        user.schedule ?? DEFAULT_SCHEDULE,
      );

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          registration: user.registration,
          department: user.department,
          position: user.position,
        },
        totals: summary.totals,
      };
    });

    const totals = employees.reduce(
      (accumulator, employee) => this.addTotals(accumulator, employee.totals),
      this.emptyTotals(),
    );

    return {
      month: bounds.month,
      from: bounds.firstDay,
      to: bounds.lastDay,
      department: department ?? null,
      employees,
      totals,
    };
  }

  async dashboard() {
    const today = todayKey();
    const bounds = monthBounds(today.slice(0, 7));
    const now = nowInTimezone();
    const weekStart = now.subtract(6, 'day').startOf('day');
    const todayBounds = {
      start: now.startOf('day').toDate(),
      end: now.endOf('day').toDate(),
    };

    const [activeEmployees, records] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { active: true } }),
      this.prisma.timeRecord.findMany({
        where: {
          recordedAt: { gte: weekStart.toDate(), lte: todayBounds.end },
          voided: false,
        },
        orderBy: { recordedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              registration: true,
              department: true,
            },
          },
        },
      }),
    ]);

    const todayRecords = records.filter(
      (record) => localDateKey(record.recordedAt) === today,
    );

    const latestByUser = new Map<string, (typeof todayRecords)[number]>();
    for (const record of todayRecords) {
      if (!latestByUser.has(record.userId)) {
        latestByUser.set(record.userId, record);
      }
    }

    let workingNow = 0;
    let onBreak = 0;
    let completed = 0;

    for (const record of latestByUser.values()) {
      if (
        record.type === RecordType.CLOCK_IN ||
        record.type === RecordType.BREAK_END
      ) {
        workingNow += 1;
      } else if (record.type === RecordType.BREAK_START) {
        onBreak += 1;
      } else {
        completed += 1;
      }
    }

    const dates = eachDate(
      weekStart.format('YYYY-MM-DD'),
      today,
    );

    const last7Days = dates.map((date) => {
      const dateRecords = records.filter(
        (record) => localDateKey(record.recordedAt) === date,
      );
      return {
        date,
        present: new Set(dateRecords.map((record) => record.userId)).size,
        records: dateRecords.length,
      };
    });

    return {
      date: today,
      month: bounds.month,
      employees: {
        active: activeEmployees,
        presentToday: latestByUser.size,
        workingNow,
        onBreak,
        completed,
        withoutRecord: Math.max(0, activeEmployees - latestByUser.size),
      },
      recordsToday: todayRecords.length,
      lastPunches: todayRecords.slice(0, 10).map((record) =>
        serializeRecord(record),
      ),
      last7Days,
    };
  }

  async exportCsv(month?: string, userId?: string) {
    if (userId) {
      const report = await this.monthly(userId, month);
      const rows: (string | number)[][] = [
        [
          'Data',
          'Dia da semana',
          'Situação',
          'Entrada',
          'Saída',
          'Intervalo (min)',
          'Trabalhado',
          'Esperado',
          'Atraso (min)',
          'Extra',
          'Saldo',
        ],
        ...report.days.map((day) => [
          day.date,
          WEEKDAY_LABELS[day.weekday],
          STATUS_LABELS[day.status] ?? day.status,
          day.firstIn ?? '',
          day.lastOut ?? '',
          day.breakMinutes,
          minutesToClock(day.workedMinutes),
          minutesToClock(day.expectedMinutes),
          day.lateMinutes,
          minutesToClock(day.overtimeMinutes),
          minutesToClock(day.balanceMinutes),
        ]),
        [
          'TOTAL',
          '',
          '',
          '',
          '',
          report.totals.breakMinutes,
          minutesToClock(report.totals.workedMinutes),
          minutesToClock(report.totals.expectedMinutes),
          report.totals.lateMinutes,
          minutesToClock(report.totals.overtimeMinutes),
          minutesToClock(report.totals.balanceMinutes),
        ],
      ];

      const slug = this.slugify(report.user.name);

      return {
        filename: `relatorio-ponto-${slug}-${report.month}.csv`,
        csv: toCsv(rows),
      };
    }

    const report = await this.team(month);
    const rows: (string | number)[][] = [
      [
        'Funcionário',
        'Matrícula',
        'Departamento',
        'Dias trabalhados',
        'Ausências',
        'Trabalhado',
        'Esperado',
        'Extra',
        'Faltando',
        'Atraso (min)',
        'Saldo',
      ],
      ...report.employees.map((employee) => [
        employee.user.name,
        employee.user.registration ?? '',
        employee.user.department ?? '',
        employee.totals.daysWorked,
        employee.totals.absences,
        minutesToClock(employee.totals.workedMinutes),
        minutesToClock(employee.totals.expectedMinutes),
        minutesToClock(employee.totals.overtimeMinutes),
        minutesToClock(employee.totals.missingMinutes),
        employee.totals.lateMinutes,
        minutesToClock(employee.totals.balanceMinutes),
      ]),
    ];

    return {
      filename: `relatorio-ponto-equipe-${report.month}.csv`,
      csv: toCsv(rows),
    };
  }

  private emptyTotals() {
    return {
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
    };
  }

  private addTotals(
    accumulator: ReturnType<ReportsService['emptyTotals']>,
    totals: RangeTotals,
  ) {
    return {
      expectedMinutes: accumulator.expectedMinutes + totals.expectedMinutes,
      workedMinutes: accumulator.workedMinutes + totals.workedMinutes,
      breakMinutes: accumulator.breakMinutes + totals.breakMinutes,
      overtimeMinutes:
        accumulator.overtimeMinutes + totals.overtimeMinutes,
      missingMinutes: accumulator.missingMinutes + totals.missingMinutes,
      lateMinutes: accumulator.lateMinutes + totals.lateMinutes,
      balanceMinutes: accumulator.balanceMinutes + totals.balanceMinutes,
      daysWorked: accumulator.daysWorked + totals.daysWorked,
      absences: accumulator.absences + totals.absences,
      incompleteDays:
        accumulator.incompleteDays + totals.incompleteDays,
    };
  }

  private slugify(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
