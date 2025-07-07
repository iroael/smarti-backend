import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from '../../entities/orders/order.entity';
import { OrderItem } from '../../entities/orders/order-item.entity';
import { Product } from '../../entities/product/product.entity';
import { Customer } from '../../entities/customer.entity';
import { Supplier } from '../../entities/supplier.entity';
import { Tax } from '../../entities/tax.entity';
import { OrderItemTax } from '../../entities/orders/order-item-tax.entity';
import { MidtransModule } from '../midtrans/midtrans.module'; // <-- Import MidtransModule
import { XenditModule } from '../xendit/xendit.module'; // <-- Import MidtransModule
import { SupplierSupplierAccess } from 'src/entities/supplier-supplier-access.entity';
import { Addresses } from 'src/entities/address.entity';
import { ProductBundleItem } from 'src/entities/product/product-bundle-item.entity';
import { AccurateModule } from 'src/integrate-accurate/accurate/accurate.module';

@Module({
  imports: [
    // TypeOrmModule.forFeature([Order, OrderItem, Product, Customer, Supplier, Tax, OrderItemTax, SupplierSupplierAccess]),
    TypeOrmModule.forFeature([Order, OrderItem, Product, ProductBundleItem, Customer, Supplier, Tax, OrderItemTax, SupplierSupplierAccess, Addresses]),
    forwardRef(() => MidtransModule),
    forwardRef(() => XenditModule), // <-- Import XenditModule
    AccurateModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
