import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecordSource, RecordType } from '@prisma/client';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateTimeRecordDto {
  @ApiProperty({ description: 'ID do funcionário.' })
  @IsString()
  userId: string;

  @ApiProperty({ enum: RecordType })
  @IsEnum(RecordType, { message: 'Tipo de registro inválido.' })
  type: RecordType;

  @ApiProperty({ example: '2026-10-23T08:00:00-03:00' })
  @IsISO8601({}, { message: 'recordedAt deve ser uma data/hora válida.' })
  recordedAt: string;

  @ApiPropertyOptional({ enum: RecordSource, default: RecordSource.MANUAL })
  @IsOptional()
  @IsEnum(RecordSource, { message: 'Origem do registro inválida.' })
  source?: RecordSource;

  @ApiPropertyOptional({ example: 'Correção autorizada pelo RH.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
