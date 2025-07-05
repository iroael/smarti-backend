import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseOrder } from 'src/entities/purchase/purchase-order.entity';
import { PurchaseOrderItem } from 'src/entities/purchase/purchase-order-item.entity';
import { PurchaseOrderItemTax } from 'src/entities/purchase/purchase-order-item-tax.entity';
import { PurchaseRelateOrder } from 'src/entities/purchase/purchase-relate-order.entity';
import { PurchaseOrderService } from './purchase-order.service';
import { PurchaseOrderController } from './purchase-order.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseOrder,
      PurchaseOrderItem,
      PurchaseOrderItemTax,
      PurchaseRelateOrder,
    ]),
  ],
  controllers: [PurchaseOrderController],
  providers: [PurchaseOrderService],
})
export class PurchaseOrderModule {}
