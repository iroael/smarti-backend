import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany
} from 'typeorm';
import { PurchaseInvoice } from './purchase-invoice.entity';
import { Product } from '../product/product.entity';
import { PurchaseInvoiceItemTax } from './purchase-invoice-item-tax.entity';

@Entity('purchase_invoice_items')
export class PurchaseInvoiceItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => PurchaseInvoice, invoice => invoice.items)
  purchaseInvoice: PurchaseInvoice;

  @ManyToOne(() => Product)
  product: Product;

  @Column()
  quantity: number;

  @Column('decimal')
  price: number;

  @Column('decimal')
  subtotal: number;

  @OneToMany(() => PurchaseInvoiceItemTax, tax => tax.purchaseInvoiceItem)
  taxes: PurchaseInvoiceItemTax[];
}
