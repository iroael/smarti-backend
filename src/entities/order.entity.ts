import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, CreateDateColumn } from 'typeorm';
import { Customer } from './customer.entity';
import { OrderItem } from './order-item.entity';

@Entity()
export class Order {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  orderNumber: string;

  @ManyToOne(() => Customer, (customer) => customer.orders, { eager: true })
  customer: Customer;

  @CreateDateColumn()
  orderDate: Date;

  @Column()
  status: string; // contoh: 'pending', 'paid', 'cancelled'

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: number;

  @OneToMany(() => OrderItem, (item) => item.order, {
    cascade: true,
    eager: true,
  })
  items: OrderItem[];
}
