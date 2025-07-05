import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
} from 'typeorm';
import { OrderItem } from './order-item.entity';
import { Tax } from '../tax.entity';

@Entity()
export class OrderItemTax {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => OrderItem, (orderItem) => orderItem.taxes, { onDelete: 'CASCADE' })
  orderItem: OrderItem;

  @ManyToOne(() => Tax, { eager: true })
  tax: Tax;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  taxRate: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  taxAmount: number;
}
