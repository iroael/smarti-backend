import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  JoinColumn
} from 'typeorm';
import { Customer } from './customer.entity';
import { Supplier } from './supplier.entity'; // Import Supplier
import { OrderItem } from './order-item.entity';
import { Shipping } from './shipping.entity';
import { Payment } from './payment.entity';
import { OrderStatus } from 'src/common/enums/order-status.enum';

@Entity('order')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  orderNumber: string;

  @ManyToOne(() => Customer, (customer) => customer.orders, { eager: true })
  customer: Customer;

  @ManyToOne(() => Supplier, (supplier) => supplier.orders, { eager: true })
  supplier: Supplier;

  @CreateDateColumn()
  orderDate: Date;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: number;

  @OneToMany(() => OrderItem, (item) => item.order, {
    cascade: true,
    eager: true,
  })
  items: OrderItem[];

  // === Parent Order ===
  @ManyToOne(() => Order, (order) => order.subOrders, { nullable: true })
  @JoinColumn({ name: 'parentOrderId' })
  parentOrder?: Order;

  @OneToMany(() => Order, (order) => order.parentOrder)
  subOrders: Order[];

  // === Payment ===
  @OneToMany(() => Payment, (payment) => payment.order)
  payments: Payment[];

  // === Shipping ===
  @OneToMany(() => Shipping, (shipping) => shipping.order)
  shippings: Shipping[];
}
