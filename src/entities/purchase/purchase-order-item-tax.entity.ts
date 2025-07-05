import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne
} from 'typeorm';
import { PurchaseOrderItem } from './purchase-order-item.entity';
import { Tax } from '../tax.entity';

@Entity('purchase_order_item_taxes')
export class PurchaseOrderItemTax {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => PurchaseOrderItem, item => item.taxes)
  purchaseOrderItem: PurchaseOrderItem;

  @ManyToOne(() => Tax)
  tax: Tax;

  @Column('decimal')
  taxRate: number;

  @Column('decimal')
  taxAmount: number;
}
