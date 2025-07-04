import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Supplier } from '../supplier.entity';
import { ProductPrice } from './product-price.entity';
import { ProductBundleItem } from './product-bundle-item.entity';
import { ProductTax } from './product-tax.entity';

export enum InventoryType {
  STOCK = 'INVENTORY',
  SERVICE = 'JASA',
  BUNDLE = 'GROUP',
  NON_INVENTORY = 'NON_INVENTORY',
}

export enum UoM {
  PCS = 'PCS',
  LOT = 'LOT',
}

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

  @Column({ default: false })
  is_bundle: boolean;

  @Column({ nullable: true })
  length: number;

  @Column({ nullable: true })
  width: number;

  @Column({ nullable: true })
  height: number;

  @Column({ nullable: true })
  weight: number;

  @Column({ nullable: true })
  dimension: string;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({
    type: 'enum',
    enum: UoM,
    default: UoM.PCS,
    nullable: true,
  })
  uom: string;

  @Column({
    type: 'enum',
    enum: InventoryType,
    default: InventoryType.STOCK,
  })
  inventory_type: InventoryType;

  @ManyToOne(() => Supplier, (supplier) => supplier.products, { eager: true })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @OneToMany(() => ProductPrice, (price) => price.product, {
    cascade: true,
    eager: true,
  })
  prices: ProductPrice[];

  @OneToMany(() => ProductTax, (pt) => pt.product, {
    cascade: true,
    eager: true,
  })
  productTaxes: ProductTax[];

  @OneToMany(() => ProductBundleItem, (item) => item.bundle, {
    cascade: true,
    eager: false,
  })
  bundleItems: ProductBundleItem[];

  @Column({ default: false })
  is_deleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  deleted_at: Date | null;

  @CreateDateColumn()
  created_at: Date;
}
