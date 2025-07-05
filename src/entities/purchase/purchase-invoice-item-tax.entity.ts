import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne
} from 'typeorm';
import { PurchaseInvoiceItem } from './purchase-invoice-item.entity';
import { Tax } from '../tax.entity';

@Entity('purchase_invoice_item_taxes')
export class PurchaseInvoiceItemTax {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => PurchaseInvoiceItem, item => item.taxes)
  purchaseInvoiceItem: PurchaseInvoiceItem;

  @ManyToOne(() => Tax)
  tax: Tax;

  @Column('decimal')
  taxRate: number;

  @Column('decimal')
  taxAmount: number;
}
