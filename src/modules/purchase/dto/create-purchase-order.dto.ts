import {
  IsUUID,
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PurchaseOrderStatus } from 'src/common/enums/purchase-status.enum';
import { CreatePurchaseOrderItemDto } from './create-purchase-order-item.dto';
import { CreatePurchaseRelateOrderDto } from './create-purchase-relate-order.dto';

export class CreatePurchaseOrderDto {
  @ApiProperty({ type: String, example: '2025-07-02' })
  @IsDateString()
  orderDate: string;

  @ApiProperty({ enum: PurchaseOrderStatus })
  @IsEnum(PurchaseOrderStatus)
  status: PurchaseOrderStatus;

  @ApiProperty()
  @IsNumber()
  customerId: number;

  @ApiProperty()
  @IsNumber()
  supplierId: number;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsNumber()
  addressId?: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ required: false })
  shippingCost?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreatePurchaseRelateOrderDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseRelateOrderDto)
  relateOrders: CreatePurchaseRelateOrderDto[];

  @ApiProperty({ type: [CreatePurchaseOrderItemDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items?: CreatePurchaseOrderItemDto[];
}
