import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Supplier } from './supplier.entity';
import { ProductPrice } from './product-price.entity';
import { ProductBundleItem } from './product-bundle-item.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  product_code: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column('int')
  stock: number;

  @Column({ default: false })
  is_bundle: boolean;

  @ManyToOne(() => Supplier, (supplier) => supplier.products, { eager: true })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @OneToMany(() => ProductPrice, (price) => price.product, {
    cascade: true,
    eager: true,
  })
  prices: ProductPrice[];

  @OneToMany(() => ProductBundleItem, (item) => item.bundle, {
    cascade: true,
    eager: false, // ⚠️ WAS true, now false to prevent circular eager loading
  })
  bundleItems: ProductBundleItem[];

  @CreateDateColumn()
  created_at: Date;
}
