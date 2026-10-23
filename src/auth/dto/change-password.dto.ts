import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';
import {
  PASSWORD_MESSAGE,
  PASSWORD_PATTERN,
} from '../../common/utils/password.util';

export class ChangePasswordDto {
  @ApiProperty({ example: 'SenhaAtual@123' })
  @IsString({ message: 'A senha atual deve ser um texto.' })
  @MinLength(1, { message: 'Informe a senha atual.' })
  currentPassword: string;

  @ApiProperty({ example: 'NovaSenha@456' })
  @IsString({ message: 'A nova senha deve ser um texto.' })
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  newPassword: string;
}
