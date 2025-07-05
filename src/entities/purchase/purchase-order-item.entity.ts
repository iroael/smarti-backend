import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany
} from 'typeorm';
import { PurchaseOrder } from './purchase-order.entity';
import { Product } from '../product/product.entity';
import { PurchaseOrderItemTax } from './purchase-order-item-tax.entity';

@Entity('purchase_order_items')
export class PurchaseOrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => PurchaseOrder, po => po.items)
  purchaseOrder: PurchaseOrder;

  @ManyToOne(() => Product)
  product: Product;

  @Column()
  quantity: number;

  @Column('decimal')
  price: number;

  @Column('decimal')
  subtotal: number;

  @OneToMany(() => PurchaseOrderItemTax, tax => tax.purchaseOrderItem)
  taxes: PurchaseOrderItemTax[];
}
