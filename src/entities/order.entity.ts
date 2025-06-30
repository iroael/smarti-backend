import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Customer } from './customer.entity';
import { Supplier } from './supplier.entity';
import { OrderItem } from './order-item.entity';
import { Shipping } from './shipping.entity';
import { Payment } from './payment.entity';
import { OrderStatus } from 'src/common/enums/order-status.enum';

@Entity('order')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  orderNumber: string;

  // ========= Customer (FK UUID atau integer, sesuaikan dengan customer) =========
  @Column()
  customerId: number;

  @ManyToOne(() => Customer, { createForeignKeyConstraints: false, eager: true })
  @JoinColumn({ name: 'customerId' })
  customer?: Customer;

  // ========= Supplier =========
  @Column()
  supplierId: number;

  @ManyToOne(() => Supplier, { createForeignKeyConstraints: false, eager: true })
  @JoinColumn({ name: 'supplierId' })
  supplier?: Supplier;

  @CreateDateColumn()
  orderDate: Date;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'text', nullable: true })
  deliveryAddress?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subTotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  shippingCost: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: number;

  @OneToMany(() => OrderItem, (item) => item.order, {
    cascade: true,
    eager: true,
  })
  items: OrderItem[];

  @Column({ type: 'text', nullable: true })
  snapToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  snapTokenExpiredAt?: Date;

  // ========= Parent Order (UUID) =========
  @Column({ type: 'uuid', nullable: true })
  parentOrderId?: string;

  @ManyToOne(() => Order, (order) => order.subOrders, { nullable: true })
  @JoinColumn({ name: 'parentOrderId' })
  parentOrder?: Order;

  @OneToMany(() => Order, (order) => order.parentOrder)
  subOrders: Order[];

  // ========= Payment =========
  @OneToMany(() => Payment, (payment) => payment.order)
  payments: Payment[];

  // ========= Shipping =========
  @OneToMany(() => Shipping, (shipping) => shipping.order)
  shippings: Shipping[];
}
