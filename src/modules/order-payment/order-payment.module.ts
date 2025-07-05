import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderPayment } from 'src/entities/orders/order-payment.entity';
import { OrderPaymentService } from './order-payment.service';
import { OrderPaymentController } from './order-payment.controller';
import { Order } from 'src/entities/orders/order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OrderPayment, Order])],
  controllers: [OrderPaymentController],
  providers: [OrderPaymentService],
  exports: [OrderPaymentService],
})
export class OrderPaymentModule {}
