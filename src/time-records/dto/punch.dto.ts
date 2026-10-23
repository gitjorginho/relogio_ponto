import { ApiPropertyOptional } from '@nestjs/swagger';
import { RecordType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class PunchDto {
  @ApiPropertyOptional({
    enum: RecordType,
    description:
      'Quando omitido, o sistema identifica automaticamente o próximo registro.',
  })
  @IsOptional()
  @IsEnum(RecordType, { message: 'Tipo de registro inválido.' })
  type?: RecordType;

  @ApiPropertyOptional({ example: -23.55052 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ example: -46.633308 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ example: 15.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  accuracy?: number;

  @ApiPropertyOptional({ example: 'App móvel' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  device?: string;

  @ApiPropertyOptional({ example: 'Registro realizado no cliente.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
