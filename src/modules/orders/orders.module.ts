import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from '../../entities/order.entity';
import { OrderItem } from '../../entities/order-item.entity';
import { Product } from '../../entities/product.entity';
import { Customer } from '../../entities/customer.entity';
import { Supplier } from '../../entities/supplier.entity';
import { MidtransModule } from '../midtrans/midtrans.module'; // <-- Import MidtransModule

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Product, Customer, Supplier]),
    forwardRef(() => MidtransModule),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
