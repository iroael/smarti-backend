import { IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCustomerAccessDto {
  @ApiProperty({ example: 10, description: 'ID customer yang diberi akses' })
  @IsNumber()
  customerId: number;

  @ApiProperty({ example: 20, description: 'ID supplier yang dapat diakses oleh customer' })
  @IsNumber()
  supplierId: number;
}
