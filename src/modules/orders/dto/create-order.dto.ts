import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsArray, IsOptional, IsString } from 'class-validator';

export class CreateOrderItemDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  productId: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  customerId: number;

  // Catatan: supplierId biasanya tidak perlu karena diambil dari product.supplier

  @ApiProperty({
    example: 'Please handle with care, fragile items included',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    example: 12345,
    required: false,
    description: 'ID atau kode numeric untuk alamat pengiriman',
  })
  @IsOptional()
  @IsNumber()
  deliveryAddress?: number;

  @ApiProperty({
    example: 10000,
    required: true,
    description: 'Input data biaya',
  })
  @IsOptional()
  @IsNumber()
  shippingCost?: number; // ongkir, optional

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  items: CreateOrderItemDto[];
}
