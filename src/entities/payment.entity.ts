import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Order } from './order.entity';

@Entity()
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Order, (order) => order.payments, { eager: true })
  order: Order;

  @Column()
  paymentMethod: 'transfer' | 'qris' | 'midtrans' | 'manual';

  @Column()
  paymentStatus: 'unpaid' | 'paid' | 'failed' | 'refunded';

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ nullable: true })
  transactionRef: string;

  @Column({ nullable: true, type: 'timestamp' })
  paidAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
