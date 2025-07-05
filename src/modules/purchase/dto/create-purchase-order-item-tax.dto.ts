import { IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePurchaseOrderItemTaxDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  taxId: number;

  @ApiProperty({ example: 10 }) // percent
  @IsNumber()
  taxRate: number;

  @ApiProperty({ example: 1000 })
  @IsNumber()
  taxAmount: number;
}
