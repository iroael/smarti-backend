import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Customer } from './customer.entity';

@Entity('customers_address')
export class CustomerAddress {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Customer, (customer) => customer.addresses)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column()
  name: string;

  @Column()
  phone: string;

  @Column()
  city: string;

  @Column()
  province: string;

  @Column()
  address: string;

  @Column()
  postalcode: string;

  @Column({ default: true, type: 'boolean' })
  is_default: boolean;

  @Column({ default: true, type: 'boolean' })
  is_deleted: boolean;

  @CreateDateColumn()
  created_at: Date;
}
