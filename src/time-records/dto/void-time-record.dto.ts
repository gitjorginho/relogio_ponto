import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class VoidTimeRecordDto {
  @ApiProperty({ example: 'Registro duplicado.' })
  @IsString()
  @Length(3, 255, {
    message: 'O motivo deve ter entre 3 e 255 caracteres.',
  })
  reason: string;
}
