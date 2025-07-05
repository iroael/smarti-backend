import { IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreatePurchaseOrderItemTaxDto } from './create-purchase-order-item-tax.dto';

export class CreatePurchaseOrderItemDto {
  @ApiProperty({ example: 101 })
  @IsNumber()
  productId: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  quantity: number;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  price: number;

  @ApiProperty({ example: 100000 })
  @IsNumber()
  subtotal: number;

  @ApiProperty({ type: [CreatePurchaseOrderItemTaxDto] })
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemTaxDto)
  taxes: CreatePurchaseOrderItemTaxDto[];
}
