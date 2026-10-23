import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateTimeRecordDto } from './dto/create-time-record.dto';
import { PunchDto } from './dto/punch.dto';
import { QueryTimeRecordsDto } from './dto/query-time-records.dto';
import { UpdateTimeRecordDto } from './dto/update-time-record.dto';
import { VoidTimeRecordDto } from './dto/void-time-record.dto';
import { TimeRecordsService } from './time-records.service';

@ApiTags('Registro de ponto')
@ApiBearerAuth()
@Controller('time-records')
export class TimeRecordsController {
  constructor(private readonly timeRecordsService: TimeRecordsService) {}

  @Post('punch')
  @ApiOperation({ summary: 'Realiza o batimento de ponto' })
  punch(
    @CurrentUser() user: AuthUser,
    @Body() dto: PunchDto,
    @Req() request: Request,
    @Ip() ip: string,
  ) {
    const ipAddress = ip || (request.headers['x-forwarded-for'] as string) || undefined;
    const userAgent = request.headers['user-agent'];

    return this.timeRecordsService.punch(user, dto, {
      ipAddress,
      userAgent,
    });
  }

  @Get('status')
  @ApiOperation({ summary: 'Status do ponto no dia atual' })
  status(@CurrentUser() user: AuthUser) {
    return this.timeRecordsService.status(user);
  }

  @Get('me')
  @ApiOperation({ summary: 'Histórico de ponto do usuário autenticado' })
  findMine(
    @CurrentUser() user: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('type') type?: string,
  ) {
    return this.timeRecordsService.findMine(user, { from, to, type });
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Lista registros de ponto com filtros' })
  findAll(@Query() query: QueryTimeRecordsDto) {
    return this.timeRecordsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulta um registro de ponto' })
  findOne(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.timeRecordsService.findOne(id, actor);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Insere registro manual de ponto' })
  createManual(@Body() dto: CreateTimeRecordDto) {
    return this.timeRecordsService.createManual(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Edita um registro de ponto' })
  update(@Param('id') id: string, @Body() dto: UpdateTimeRecordDto) {
    return this.timeRecordsService.update(id, dto);
  }

  @Patch(':id/void')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Cancela um registro de ponto' })
  voidRecord(
    @Param('id') id: string,
    @Body() dto: VoidTimeRecordDto,
  ) {
    return this.timeRecordsService.voidRecord(id, dto);
  }

  @Patch(':id/restore')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Restaura um registro cancelado' })
  restoreRecord(@Param('id') id: string) {
    return this.timeRecordsService.restoreRecord(id);
  }
}