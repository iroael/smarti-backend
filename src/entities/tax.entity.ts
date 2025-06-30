import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { ProductTax } from './product-tax.entity';

@Entity('taxes')
export class Tax {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string; // e.g., "PPN 11%"

  @Column('decimal', { precision: 5, scale: 2 })
  rate: number; // e.g., 11.00

  @Column('text', { nullable: true })
  description: string;


  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => ProductTax, (pt) => pt.tax)
  productTaxes: ProductTax[];
}
