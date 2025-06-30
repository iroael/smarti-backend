import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSnapTokenDto {
  @ApiProperty({ example: 'new-snap-token-12345' })
  @IsNotEmpty()
  @IsString()
  snapToken: string;
}
