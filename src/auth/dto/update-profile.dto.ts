import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Maria Souza' })
  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'O nome deve ser um texto.' })
  @Length(2, 120, { message: 'O nome deve ter entre 2 e 120 caracteres.' })
  name?: string;

  @ApiPropertyOptional({ example: '(11) 99999-0000' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(20)
  phone?: string;
}
