import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Order } from './orders/order.entity';

@Entity('shippings')
export class Shipping {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @ManyToOne(() => Order, (order) => order.shippings, { eager: true })
  order: Order;

  @Column({ name: 'courier_name' })
  courierName: string;

  @Column({ name: 'tracking_number' })
  trackingNumber: string;

  @Column({ name: 'shipping_status' })
  shippingStatus: 'pending' | 'shipped' | 'delivered' | 'cancelled';

  @Column({ name: 'shipped_at', type: 'timestamp', nullable: true })
  shippedAt: Date;

  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
