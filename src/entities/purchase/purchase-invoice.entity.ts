import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  OneToMany, CreateDateColumn
} from 'typeorm';
import { PurchaseOrder } from './purchase-order.entity';
import { PurchaseInvoiceItem } from './purchase-invoice-item.entity';
import { PurchaseInvoiceStatus } from 'src/common/enums/purchase-status.enum';

@Entity('purchase_invoices')
export class PurchaseInvoice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  invoiceNumber: string;

  @ManyToOne(() => PurchaseOrder)
  purchaseOrder: PurchaseOrder;

  @Column()
  invoiceDate: Date;

  @Column()
  dueDate: Date;

  @Column({ type: 'enum', enum: PurchaseInvoiceStatus })
  status: PurchaseInvoiceStatus;

  @Column('decimal')
  subtotal: number;

  @Column('decimal')
  taxTotal: number;

  @Column('decimal')
  shippingCost: number;

  @Column('decimal')
  discount: number;

  @Column('decimal')
  total: number;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => PurchaseInvoiceItem, item => item.purchaseInvoice)
  items: PurchaseInvoiceItem[];
}
