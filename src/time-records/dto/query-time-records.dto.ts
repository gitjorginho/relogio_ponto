import { ApiPropertyOptional } from '@nestjs/swagger';
import { RecordType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const toBoolean = ({ value }: { value: unknown }): unknown => {
  if (value === 'true' || value === true) {
    return true;
  }
  if (value === 'false' || value === false) {
    return false;
  }
  return value;
};

export class QueryTimeRecordsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'ID do funcionário.' })
  @IsOptional()
  @IsString()
  userId?: string;

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

  @ApiPropertyOptional({ description: 'Inclui registros cancelados.' })
  @IsOptional()
  @Transform(toBoolean)
  includeVoided?: boolean;
}
