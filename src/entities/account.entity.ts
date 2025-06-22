import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Supplier } from './supplier.entity';
import { Customer } from './customer.entity';

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ type: 'enum', enum: ['admin', 'superadmin', 'supplier', 'customer'] })
  role: 'admin' | 'superadmin' | 'supplier' | 'customer';

  @OneToOne(() => User, (user) => user.account, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  // Jika satu account hanya bisa milik satu supplier, gunakan OneToOne
  @OneToOne(() => Supplier, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'supplier_id' })
  supplier?: Supplier;

  @Column({ type: 'int', nullable: true })
  customer_id?: number;

  @CreateDateColumn()
  created_at: Date;
}
