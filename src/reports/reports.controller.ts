import {
  Controller,
  Get,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { Roles } from '../common/decorators/roles.decorator';
import {
  DailyReportQueryDto,
  ExportReportQueryDto,
  MonthlyReportQueryDto,
  TeamReportQueryDto,
} from './dto/report-query.dto';
import { ReportsService } from './reports.service';

@ApiTags('Relatórios')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('monthly')
  @ApiOperation({ summary: 'Relatório mensal individual' })
  monthly(
    @CurrentUser() user: AuthUser,
    @Query() query: MonthlyReportQueryDto,
  ) {
    return this.reportsService.monthly(query.userId ?? user.id, query.month);
  }

  @Get('daily')
  @ApiOperation({ summary: 'Relatório diário individual' })
  daily(
    @CurrentUser() user: AuthUser,
    @Query() query: DailyReportQueryDto,
  ) {
    return this.reportsService.daily(query.userId ?? user.id, query.date);
  }

  @Get('team')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Relatório consolidado da equipe' })
  team(@Query() query: TeamReportQueryDto) {
    return this.reportsService.team(query.month, query.department);
  }

  @Get('dashboard')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Dashboard com indicadores em tempo real' })
  dashboard() {
    return this.reportsService.dashboard();
  }

  @Get('export')
  @ApiOperation({ summary: 'Exportação CSV do relatório' })
  async export(
    @CurrentUser() user: AuthUser,
    @Query() query: ExportReportQueryDto,
    @Res() response: Response,
  ) {
    const { ForbiddenException } = await import('@nestjs/common');
    const isManager = user.role === Role.ADMIN || user.role === Role.MANAGER;
    const requestedUserId = query.userId;

    if (requestedUserId && requestedUserId !== user.id && !isManager) {
      throw new ForbiddenException(
        'Sem permissão para exportar relatório de outro funcionário.',
      );
    }

    const targetUserId =
      isManager && requestedUserId ? requestedUserId : user.id;
    const result = await this.reportsService.exportCsv(query.month, targetUserId);

    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    response.write('\ufeff');
    return response.end(result.csv);
  }
}