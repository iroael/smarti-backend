import { IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetDefaultAddressDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  addressId: number;
}
