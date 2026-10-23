import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  PASSWORD_MESSAGE,
  PASSWORD_PATTERN,
} from '../../common/utils/password.util';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class RegisterDto {
  @ApiProperty({ example: 'Maria Souza' })
  @Transform(trim)
  @IsString({ message: 'O nome deve ser um texto.' })
  @Length(2, 120, { message: 'O nome deve ter entre 2 e 120 caracteres.' })
  name: string;

  @ApiProperty({ example: 'maria.souza@empresa.com' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email: string;

  @ApiProperty({ example: 'Senha@123' })
  @IsString({ message: 'A senha deve ser um texto.' })
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  password: string;

  @ApiPropertyOptional({ example: 'MAT-0001' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(30)
  registration?: string;

  @ApiPropertyOptional({ example: '123.456.789-00' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(20)
  document?: string;

  @ApiPropertyOptional({ example: 'Operações' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  department?: string;

  @ApiPropertyOptional({ example: 'Analista' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  position?: string;

  @ApiPropertyOptional({ example: '(11) 99999-0000' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(20)
  phone?: string;
}
