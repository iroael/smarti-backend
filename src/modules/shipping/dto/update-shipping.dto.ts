import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNotEmpty, IsEnum, IsDateString, IsString } from 'class-validator';

export class UpdateShippingDto {
  @ApiProperty({ example: 'a7e614cd-3c1c-4f6a-bd7f-dc30c7a0baf3' })
  @IsNotEmpty()
  orderId: string;

  @ApiPropertyOptional({ example: 'SiCepat' })
  @IsOptional()
  @IsString()
  courier_name?: string;

  @ApiPropertyOptional({ example: 'SICEPAT99887766' })
  @IsOptional()
  @IsString()
  tracking_number?: string;

  @ApiPropertyOptional({
    example: 'shipped',
    enum: ['pending', 'shipped', 'delivered', 'cancelled'],
  })
  @IsOptional()
  @IsEnum(['pending', 'shipped', 'delivered', 'cancelled'])
  shipping_status?: 'pending' | 'shipped' | 'delivered' | 'cancelled';

  @ApiPropertyOptional({ example: '2025-06-29T12:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  shipped_at?: Date;

  @ApiPropertyOptional({ example: '2025-07-01T16:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  delivered_at?: Date;
}
