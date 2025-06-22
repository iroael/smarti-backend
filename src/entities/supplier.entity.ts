// supplier.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  OneToOne,
} from 'typeorm';
import { Product } from './product.entity';
import { Order } from './order.entity';
import { BankAccount } from './bank-account.entity';
import { TaxIdentification } from './tax-identifications.entity';

@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true, unique: true })
  supplier_code: string;

  @Column()
  name: string;

  @Column('text')
  address: string;

  @Column()
  phone: string;

  @Column({ unique: true })
  email: string;

  @OneToMany(() => Product, (product) => product.supplier)
  products: Product[];

  @OneToMany(() => Order, (order) => order.supplier)
  orders: Order[];

  @CreateDateColumn()
  created_at: Date;
}