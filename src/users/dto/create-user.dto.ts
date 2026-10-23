import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Role } from '@prisma/client';
import { RegisterDto } from '../../auth/dto/register.dto';
import { UpsertScheduleDto } from '../../schedules/dto/upsert-schedule.dto';

export class CreateUserDto extends RegisterDto {
  @ApiPropertyOptional({ enum: Role, default: Role.EMPLOYEE })
  @IsOptional()
  @IsEnum(Role, { message: 'Perfil inválido.' })
  role?: Role;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ type: UpsertScheduleDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpsertScheduleDto)
  schedule?: UpsertScheduleDto;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'NovaSenha@123' })
  @IsString()
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).{8,72}$/, {
    message: 'A senha deve ter entre 8 e 72 caracteres, com pelo menos uma letra e um número.',
  })
  newPassword: string;
}
