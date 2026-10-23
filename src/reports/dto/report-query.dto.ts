import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export class MonthlyReportQueryDto {
  @ApiPropertyOptional({ example: '2026-10' })
  @IsOptional()
  @Matches(MONTH_PATTERN, {
    message: 'month deve estar no formato YYYY-MM.',
  })
  month?: string;

  @ApiPropertyOptional({ description: 'ID do funcionário. Padrão: usuário autenticado.' })
  @IsOptional()
  @IsUUID('4', { message: 'userId deve ser um UUID válido.' })
  userId?: string;
}

export class DailyReportQueryDto {
  @ApiPropertyOptional({ example: '2026-10-23' })
  @IsOptional()
  @Matches(DATE_PATTERN, {
    message: 'date deve estar no formato YYYY-MM-DD.',
  })
  date?: string;

  @ApiPropertyOptional({ description: 'ID do funcionário. Padrão: usuário autenticado.' })
  @IsOptional()
  @IsUUID('4', { message: 'userId deve ser um UUID válido.' })
  userId?: string;
}

export class TeamReportQueryDto {
  @ApiPropertyOptional({ example: '2026-10' })
  @IsOptional()
  @Matches(MONTH_PATTERN, {
    message: 'month deve estar no formato YYYY-MM.',
  })
  month?: string;

  @ApiPropertyOptional({ example: 'Operações' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  department?: string;
}

export class ExportReportQueryDto {
  @ApiPropertyOptional({ example: '2026-10' })
  @IsOptional()
  @Matches(MONTH_PATTERN, {
    message: 'month deve estar no formato YYYY-MM.',
  })
  month?: string;

  @ApiPropertyOptional({
    description:
      'ID do funcionário. Quando omitido, exporta o relatório de toda a equipe.',
  })
  @IsOptional()
  @IsUUID('4', { message: 'userId deve ser um UUID válido.' })
  userId?: string;
}
