import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parseTimeToMinutes } from '../common/utils/time.util';
import { scheduleSelect } from '../common/prisma/user.select';
import { UpsertScheduleDto } from './dto/upsert-schedule.dto';

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Funcionário não encontrado.');
    }
  }

  async findByUser(userId: string) {
    await this.ensureUser(userId);

    const schedule = await this.prisma.workSchedule.findUnique({
      where: { userId },
      select: scheduleSelect,
    });

    if (schedule) {
      return schedule;
    }

    return this.prisma.workSchedule.create({
      data: { userId },
      select: scheduleSelect,
    });
  }

  async upsert(userId: string, dto: UpsertScheduleDto) {
    await this.ensureUser(userId);

    const current = await this.prisma.workSchedule.findUnique({
      where: { userId },
      select: scheduleSelect,
    });

    const startTime = dto.startTime ?? current?.startTime ?? '08:00';
    const endTime = dto.endTime ?? current?.endTime ?? '17:00';
    const breakMinutes = dto.breakMinutes ?? current?.breakMinutes ?? 60;

    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = parseTimeToMinutes(endTime);

    if (endMinutes <= startMinutes) {
      throw new BadRequestException(
        'O horário de saída deve ser maior que o horário de entrada.',
      );
    }

    if (breakMinutes >= endMinutes - startMinutes) {
      throw new BadRequestException(
        'O intervalo deve ser menor que a carga horária diária.',
      );
    }

    return this.prisma.workSchedule.upsert({
      where: { userId },
      create: {
        userId,
        startTime,
        endTime,
        breakMinutes,
        workdays: dto.workdays ?? '1,2,3,4,5',
        toleranceMinutes: dto.toleranceMinutes ?? 10,
      },
      update: {
        ...(dto.startTime !== undefined ? { startTime } : {}),
        ...(dto.endTime !== undefined ? { endTime } : {}),
        ...(dto.breakMinutes !== undefined ? { breakMinutes } : {}),
        ...(dto.workdays !== undefined ? { workdays: dto.workdays } : {}),
        ...(dto.toleranceMinutes !== undefined
          ? { toleranceMinutes: dto.toleranceMinutes }
          : {}),
      },
      select: scheduleSelect,
    });
  }
}
