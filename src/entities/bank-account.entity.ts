// bank-account.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  JoinColumn,
  ManyToOne
} from 'typeorm';
import { Customer } from './customer.entity';

@Entity('bank_accounts')
@Index(['ownerType', 'ownerId'])
export class BankAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: ['customer', 'supplier'] })
  ownerType: 'customer' | 'supplier';

  @Column()
  ownerId: number;

  @Column()
  bankName: string;

  @Column()
  accountNumber: string;

  @Column()
  accountName: string;

  @Column({ nullable: true })
  branch: string;

  @Column({ default: false })
  isPrimary: boolean;

  @CreateDateColumn()
  createdAt: Date;
}