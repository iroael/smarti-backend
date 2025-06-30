import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsEnum, IsDateString } from 'class-validator';
export class CreateShippingDto {
  @ApiProperty({ example: 'a7e614cd-3c1c-4f6a-bd7f-dc30c7a0baf3' })
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ example: 'JNE' })
  @IsNotEmpty()
  courierName: string;

  @ApiProperty({ example: 'JNE1234567890' })
  @IsNotEmpty()
  trackingNumber: string;

  @ApiProperty({
    example: 'pending',
    enum: ['pending', 'shipped', 'delivered', 'cancelled'],
  })
  @IsEnum(['pending', 'shipped', 'delivered', 'cancelled'])
  shippingStatus: 'pending' | 'shipped' | 'delivered' | 'cancelled';

  @ApiPropertyOptional({ example: '2025-06-28T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  shippedAt?: Date;

  @ApiPropertyOptional({ example: '2025-06-29T15:30:00.000Z' })
  @IsOptional()
  @IsDateString()
  deliveredAt?: Date;
}
