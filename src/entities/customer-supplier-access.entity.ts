import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { Customer } from './customer.entity';
import { Supplier } from './supplier.entity';

@Entity('customer_supplier_access')
export class CustomerSupplierAccess {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  customer: Customer;

  @ManyToOne(() => Supplier, { onDelete: 'CASCADE' })
  supplier: Supplier;

  @CreateDateColumn()
  createdAt: Date;
}
