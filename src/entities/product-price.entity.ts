import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Product } from './product.entity';

@Entity('product_prices')
export class ProductPrice {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Product, (product) => product.prices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column('decimal', { precision: 10, scale: 2 })
  dpp_beli: number;

  @Column('decimal', { precision: 10, scale: 2 })
  dpp_jual: number;

  @Column('decimal', { precision: 10, scale: 2 })
  h_jual_b: number;

  @CreateDateColumn()
  created_at: Date;
}
