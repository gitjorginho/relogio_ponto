import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, Matches } from 'class-validator';
import { RecordType } from '@prisma/client';

const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export class RangeQueryDto {
  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsOptional()
  @Matches(DATE_PATTERN, {
    message: 'from deve estar no formato YYYY-MM-DD.',
  })
  from?: string;

  @ApiPropertyOptional({ example: '2026-10-31' })
  @IsOptional()
  @Matches(DATE_PATTERN, {
    message: 'to deve estar no formato YYYY-MM-DD.',
  })
  to?: string;

  @ApiPropertyOptional({ enum: RecordType })
  @IsOptional()
  @IsEnum(RecordType, { message: 'Tipo de registro inválido.' })
  type?: RecordType;
}
