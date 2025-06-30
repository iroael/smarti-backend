import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { Tax } from './tax.entity';

@Entity('product_taxes')
export class ProductTax {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Product, (product) => product.productTaxes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => Tax, (tax) => tax.productTaxes, { eager: true })
  @JoinColumn({ name: 'tax_id' })
  tax: Tax;

  @CreateDateColumn()
  created_at: Date;
}
