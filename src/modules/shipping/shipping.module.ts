import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shipping } from 'src/entities/shipping.entity';
import { ShippingService } from './shipping.service';
import { ShippingController } from './shipping.controller';
import { Order } from 'src/entities/order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Shipping, Order])],
  controllers: [ShippingController],
  providers: [ShippingService],
})
export class ShippingModule {}
