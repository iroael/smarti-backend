import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  OneToMany, CreateDateColumn, JoinColumn
} from 'typeorm';
import { Customer } from '../customer.entity';
import { Supplier } from '../supplier.entity';
import { Addresses } from '../address.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';
import { PurchaseOrderStatus } from 'src/common/enums/purchase-status.enum';
import { PurchaseRelateOrder } from './purchase-relate-order.entity';

@Entity('purchase_orders')
export class PurchaseOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  poNumber: string;

  @Column()
  orderDate: Date;

  @Column({ type: 'enum', enum: PurchaseOrderStatus })
  status: PurchaseOrderStatus;

  // @ManyToOne(() => Supplier)
  // supplier: Supplier;

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
  // ========= Address (FK UUID atau integer, sesuaikan dengan address) =========
  @Column({ nullable: true })
  addressId: number;

  @ManyToOne(() => Addresses, { nullable: true })
  @JoinColumn({ name: 'addressId' })
  address?: Addresses;

  @Column({ nullable: true })
  notes: string;

  @Column('decimal')
  subtotal: number;

  @Column('decimal')
  taxTotal: number;

  @Column('decimal')
  shippingCost: number;

  @Column('decimal')
  total: number;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => PurchaseOrderItem, item => item.purchaseOrder)
  items: PurchaseOrderItem[];

  @OneToMany(() => PurchaseRelateOrder, rel => rel.purchaseOrder)
  relateOrders: PurchaseRelateOrder[];
}
