import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class UpsertScheduleDto {
  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'startTime deve estar no formato HH:mm.',
  })
  startTime?: string;

  @ApiPropertyOptional({ example: '17:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'endTime deve estar no formato HH:mm.',
  })
  endTime?: string;

  @ApiPropertyOptional({
    example: 60,
    description: 'Duração do intervalo em minutos.',
  })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(240)
  breakMinutes?: number;

  @ApiPropertyOptional({
    example: '1,2,3,4,5',
    description:
      'Dias trabalhados (0=domingo ... 6=sábado), separados por vírgula.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[0-6](,[0-6])*$/, {
    message: 'workdays deve conter dias entre 0 e 6 separados por vírgula.',
  })
  workdays?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Tolerância de atraso em minutos.',
  })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(120)
  toleranceMinutes?: number;
}
