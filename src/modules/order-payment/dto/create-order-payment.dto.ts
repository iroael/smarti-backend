import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaymentMethod, PaymentStatus } from 'src/entities/orders/order-payment.entity';

export class CreateOrderPaymentDto {
  @ApiProperty({ example: 'uuid-order-id', description: 'Order ID (UUID)' })
  @IsUUID()
  orderId: string;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ enum: PaymentStatus })
  @IsEnum(PaymentStatus)
  paymentStatus: PaymentStatus;

  @ApiProperty({ example: 150000.0 })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'TRX12345678', required: false })
  @IsOptional()
  @IsString()
  transactionRef?: string;

  @ApiProperty({ example: '2025-07-02T12:34:56Z', required: false })
  @IsOptional()
  paidAt?: Date;
}
