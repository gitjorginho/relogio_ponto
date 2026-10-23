import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RecordSource, Role } from '@prisma/client';
import {
  DEFAULT_SCHEDULE,
  RECORD_TYPE_LABELS,
  RecordLike,
  ScheduleLike,
  buildRangeSummary,
  computeDaySummary,
  getNextRecordType,
  isValidTransition,
  serializeRecord,
} from '../common/utils/attendance.util';
import {
  DATE_FORMAT,
  dayBounds,
  daysBetween,
  eachDate,
  parseDate,
  parseDateTimeInput,
  todayKey,
} from '../common/utils/time.util';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTimeRecordDto } from './dto/create-time-record.dto';
import { PunchDto } from './dto/punch.dto';
import { QueryTimeRecordsDto } from './dto/query-time-records.dto';
import { UpdateTimeRecordDto } from './dto/update-time-record.dto';
import { VoidTimeRecordDto } from './dto/void-time-record.dto';

const MAX_RANGE_DAYS = 366;
const DUPLICATE_WINDOW_MS = 60_000;
const FUTURE_TOLERANCE_MS = 5 * 60_000;

const userSummarySelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  registration: true,
  department: true,
  position: true,
  active: true,
} satisfies Prisma.UserSelect;

const recordUserSelect = {
  id: true,
  name: true,
  email: true,
  registration: true,
  department: true,
  position: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class TimeRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  private validateDate(date: string): void {
    if (parseDate(date).format(DATE_FORMAT) !== date) {
      throw new BadRequestException(`Data inválida: ${date}.`);
    }
  }

  private resolveRange(
    from?: string,
    to?: string,
  ): { from: string; to: string; dates: string[] } {
    const finalTo = to ?? todayKey();
    const finalFrom = from ?? `${finalTo.slice(0, 8)}01`;

    this.validateDate(finalFrom);
    this.validateDate(finalTo);

    if (finalFrom > finalTo) {
      throw new BadRequestException(
        'A data inicial não pode ser maior que a data final.',
      );
    }

    if (daysBetween(finalFrom, finalTo) > MAX_RANGE_DAYS) {
      throw new BadRequestException(
        `O período máximo permitido é de ${MAX_RANGE_DAYS} dias.`,
      );
    }

    return {
      from: finalFrom,
      to: finalTo,
      dates: eachDate(finalFrom, finalTo),
    };
  }

  private async findSchedule(userId: string): Promise<ScheduleLike> {
    const schedule = await this.prisma.workSchedule.findUnique({
      where: { userId },
      select: {
        startTime: true,
        endTime: true,
        breakMinutes: true,
        workdays: true,
        toleranceMinutes: true,
      },
    });

    return schedule ?? DEFAULT_SCHEDULE;
  }

  private async getDayRecords(
    userId: string,
    date: string,
  ): Promise<RecordLike[]> {
    const bounds = dayBounds(date);
    return this.prisma.timeRecord.findMany({
      where: {
        userId,
        recordedAt: { gte: bounds.start, lte: bounds.end },
        voided: false,
      },
      orderBy: { recordedAt: 'asc' },
    });
  }

  private async getRecordsBetween(
    userId: string,
    from: string,
    to: string,
  ): Promise<RecordLike[]> {
    const start = dayBounds(from).start;
    const end = dayBounds(to).end;

    return this.prisma.timeRecord.findMany({
      where: {
        userId,
        recordedAt: { gte: start, lte: end },
        voided: false,
      },
      orderBy: { recordedAt: 'asc' },
    });
  }

  private parseRecordedAt(value: string): Date {
    const date = parseDateTimeInput(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Data/hora do registro inválida.');
    }
    if (date.getTime() > Date.now() + FUTURE_TOLERANCE_MS) {
      throw new BadRequestException(
        'Não é permitido registrar um ponto em data futura.',
      );
    }
    return date;
  }

  async punch(
    user: AuthUser,
    dto: PunchDto,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    const schedule = await this.findSchedule(user.id);
    const bounds = dayBounds();
    const dayRecords = await this.getDayRecords(user.id, bounds.date);
    const lastRecord = dayRecords.at(-1);

    if (
      lastRecord &&
      Date.now() - lastRecord.recordedAt.getTime() < DUPLICATE_WINDOW_MS
    ) {
      throw new BadRequestException(
        'Aguarde pelo menos 1 minuto entre registros de ponto.',
      );
    }

    const expectedType = getNextRecordType(dayRecords, schedule);
    const breakEnabled = schedule.breakMinutes > 0;

    if (
      dto.type &&
      !isValidTransition(lastRecord?.type, dto.type, breakEnabled)
    ) {
      throw new BadRequestException(
        `Próximo registro esperado: ${RECORD_TYPE_LABELS[expectedType]}.`,
      );
    }

    const type = dto.type ?? expectedType;
    const device = (dto.device ?? meta.userAgent ?? '').slice(0, 255) || null;

    const record = await this.prisma.timeRecord.create({
      data: {
        userId: user.id,
        type,
        source: RecordSource.WEB,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        accuracy: dto.accuracy ?? null,
        ipAddress: meta.ipAddress?.slice(0, 64) ?? null,
        device,
        notes: dto.notes ?? null,
      },
    });

    const updatedRecords = await this.getDayRecords(user.id, bounds.date);
    const summary = computeDaySummary(
      bounds.date,
      updatedRecords,
      schedule,
      { includeOngoing: true },
    );

    return {
      record: serializeRecord(record),
      nextType: getNextRecordType(updatedRecords, schedule),
      summary,
    };
  }

  async status(user: AuthUser) {
    const bounds = dayBounds();
    const schedule = await this.findSchedule(user.id);
    const records = await this.getDayRecords(user.id, bounds.date);
    const summary = computeDaySummary(bounds.date, records, schedule, {
      includeOngoing: true,
    });
    const lastRecord = records.at(-1);

    return {
      date: bounds.date,
      schedule,
      nextType: getNextRecordType(records, schedule),
      lastRecord: lastRecord ? serializeRecord(lastRecord) : null,
      summary,
    };
  }

  async findMine(user: AuthUser, query: { from?: string; to?: string; type?: string }) {
    const range = this.resolveRange(query.from, query.to);
    const schedule = await this.findSchedule(user.id);
    const records = await this.getRecordsBetween(
      user.id,
      range.from,
      range.to,
    );
    const summary = buildRangeSummary(range.dates, records, schedule, {
      includeOngoing: true,
    });

    const filtered = query.type
      ? records.filter((record) => record.type === query.type)
      : records;

    return {
      from: range.from,
      to: range.to,
      records: filtered.map((record) => serializeRecord(record)),
      summary,
    };
  }

  async getSummary(
    userId: string,
    from?: string,
    to?: string,
    includeOngoing = false,
    includeEmptyDays = false,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: userSummarySelect,
    });

    if (!user) {
      throw new NotFoundException('Funcionário não encontrado.');
    }

    const range = this.resolveRange(from, to);
    const schedule = await this.findSchedule(userId);
    const records = await this.getRecordsBetween(
      userId,
      range.from,
      range.to,
    );
    const summary = buildRangeSummary(range.dates, records, schedule, {
      includeOngoing,
      includeEmptyDays,
    });

    return {
      user,
      schedule,
      from: range.from,
      to: range.to,
      ...summary,
    };
  }

  async findAll(query: QueryTimeRecordsDto) {
    const range = this.resolveRange(query.from, query.to);
    const where: Prisma.TimeRecordWhereInput = {
      recordedAt: {
        gte: dayBounds(range.from).start,
        lte: dayBounds(range.to).end,
      },
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.includeVoided ? {} : { voided: false }),
    };

    const [records, total] = await this.prisma.$transaction([
      this.prisma.timeRecord.findMany({
        where,
        include: { user: { select: recordUserSelect } },
        skip: query.skip,
        take: query.limit,
        orderBy: { recordedAt: 'desc' },
      }),
      this.prisma.timeRecord.count({ where }),
    ]);

    return {
      data: records.map((record) => serializeRecord(record)),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
        from: range.from,
        to: range.to,
      },
    };
  }

  async findOne(id: string, actor: AuthUser) {
    const record = await this.prisma.timeRecord.findUnique({
      where: { id },
      include: { user: { select: recordUserSelect } },
    });

    if (!record) {
      throw new NotFoundException('Registro de ponto não encontrado.');
    }

    const isManager =
      actor.role === Role.ADMIN || actor.role === Role.MANAGER;

    if (!isManager && (record.userId !== actor.id || record.voided)) {
      throw new NotFoundException('Registro de ponto não encontrado.');
    }

    return serializeRecord(record);
  }

  async createManual(dto: CreateTimeRecordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Funcionário não encontrado.');
    }

    const recordedAt = this.parseRecordedAt(dto.recordedAt);

    const record = await this.prisma.timeRecord.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        recordedAt,
        source: dto.source ?? RecordSource.MANUAL,
        notes: dto.notes ?? null,
      },
    });

    return serializeRecord(record);
  }

  async update(id: string, dto: UpdateTimeRecordDto) {
    const existing = await this.prisma.timeRecord.findUnique({
      where: { id },
      select: { id: true, voided: true },
    });

    if (!existing) {
      throw new NotFoundException('Registro de ponto não encontrado.');
    }

    if (existing.voided) {
      throw new BadRequestException(
        'Um registro cancelado não pode ser editado.',
      );
    }

    const recordedAt =
      dto.recordedAt !== undefined
        ? this.parseRecordedAt(dto.recordedAt)
        : undefined;

    const record = await this.prisma.timeRecord.update({
      where: { id },
      data: {
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(recordedAt !== undefined ? { recordedAt } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes || null } : {}),
      },
    });

    return serializeRecord(record);
  }

  async voidRecord(id: string, dto: VoidTimeRecordDto) {
    const existing = await this.prisma.timeRecord.findUnique({
      where: { id },
      select: { id: true, voided: true },
    });

    if (!existing) {
      throw new NotFoundException('Registro de ponto não encontrado.');
    }

    if (existing.voided) {
      throw new BadRequestException('Este registro já está cancelado.');
    }

    const record = await this.prisma.timeRecord.update({
      where: { id },
      data: {
        voided: true,
        voidedReason: dto.reason,
        voidedAt: new Date(),
      },
    });

    return {
      message: 'Registro cancelado com sucesso.',
      record: serializeRecord(record),
    };
  }

  async restoreRecord(id: string) {
    const existing = await this.prisma.timeRecord.findUnique({
      where: { id },
      select: { id: true, voided: true },
    });

    if (!existing) {
      throw new NotFoundException('Registro de ponto não encontrado.');
    }

    if (!existing.voided) {
      throw new BadRequestException('Este registro não está cancelado.');
    }

    const record = await this.prisma.timeRecord.update({
      where: { id },
      data: {
        voided: false,
        voidedReason: null,
        voidedAt: null,
      },
    });

    return {
      message: 'Registro restaurado com sucesso.',
      record: serializeRecord(record),
    };
  }
}
