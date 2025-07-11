// supplier.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  OneToOne,
} from 'typeorm';
import { Product } from './product/product.entity';
import { Order } from './orders/order.entity';

@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true, unique: true })
  supplier_code: string;

  @Column({ type: 'enum', nullable: true, enum: ['Admin', 'KSO', 'Vendor', 'Provider', 'ISP'] })
  kategori: 'Admin' | 'KSO' | 'Vendor' | 'Provider' | 'ISP';

  @Column({ nullable: true })
  npwp: string;

  @Column()
  name: string;

  @Column('text')
  address: string;

  @Column()
  phone: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  province: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  postalcode: string;

  @Column({ type: 'text', nullable: true })
  accurate_id: string;

  @Column({ type: 'text', nullable: true })
  xendit_id: string;

  @Column({ type: 'text', nullable: true })
  accurate_sc: string;

  @Column({ type: 'text', nullable: true })
  xendit_sc: string;

  @Column({nullable: true })
  astat: boolean;

  @Column({nullable: true })
  xstat: boolean;

  @OneToMany(() => Product, (product) => product.supplier)
  products: Product[];

  @OneToMany(() => Order, (order) => order.supplier)
  orders: Order[];

  @CreateDateColumn()
  created_at: Date;
}
