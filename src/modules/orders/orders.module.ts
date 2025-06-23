import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from '../../entities/order.entity';
import { OrderItem } from '../../entities/order-item.entity';
import { Product } from '../../entities/product.entity';
import { Customer } from '../../entities/customer.entity';
import { Supplier } from '../../entities/supplier.entity';
import { Tax } from '../../entities/tax.entity';
import { OrderItemTax } from '../../entities/order-item-tax.entity';
import { MidtransModule } from '../midtrans/midtrans.module'; // <-- Import MidtransModule
import { SupplierSupplierAccess } from 'src/entities/supplier-supplier-access.entity';
import { Addresses } from 'src/entities/address.entity';

@Module({
  imports: [
    // TypeOrmModule.forFeature([Order, OrderItem, Product, Customer, Supplier, Tax, OrderItemTax, SupplierSupplierAccess]),
    TypeOrmModule.forFeature([Order, OrderItem, Product, Customer, Supplier, Tax, OrderItemTax, SupplierSupplierAccess, Addresses]),
    forwardRef(() => MidtransModule),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
