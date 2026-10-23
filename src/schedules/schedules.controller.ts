import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { SchedulesService } from './schedules.service';
import { UpsertScheduleDto } from './dto/upsert-schedule.dto';

@ApiTags('Jornada de trabalho')
@ApiBearerAuth()
@Controller('users/:userId/schedule')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Consulta a jornada de trabalho do funcionário' })
  findOne(@Param('userId') userId: string) {
    return this.schedulesService.findByUser(userId);
  }

  @Put()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Cria ou atualiza a jornada de trabalho' })
  upsert(
    @Param('userId') userId: string,
    @Body() dto: UpsertScheduleDto,
  ) {
    return this.schedulesService.upsert(userId, dto);
  }
}
