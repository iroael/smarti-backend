import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn
} from 'typeorm';
import { PurchaseInvoice } from './purchase-invoice.entity';

export enum PurchasePaymentMethod {
  TRANSFER = 'transfer',
  QRIS = 'qris',
  MIDTRANS = 'midtrans',
  MANUAL = 'manual',
}

export enum PurchasePaymentStatus {
  UNPAID = 'unpaid',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Entity('purchase_payments')
export class PurchasePayment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => PurchaseInvoice)
  purchaseInvoice: PurchaseInvoice;

  @Column({ type: 'enum', enum: PurchasePaymentMethod })
  paymentMethod: PurchasePaymentMethod;

  @Column({ type: 'enum', enum: PurchasePaymentStatus })
  paymentStatus: PurchasePaymentStatus;

  @Column({ nullable: true })
  paidAt: Date;

  @Column('decimal')
  amount: number;

  @Column({ nullable: true })
  transactionRef: string;

  @CreateDateColumn()
  createdAt: Date;
}
