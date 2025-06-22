// tax-identifications.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('tax_identifications')
@Index(['ownerType', 'ownerId'])
export class TaxIdentification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: ['customer', 'supplier'] })
  ownerType: 'customer' | 'supplier';

  @Column()
  ownerId: number;

  @Column({ type: 'enum', enum: ['npwp', 'pkp', 'others'], default: 'npwp' })
  taxType: 'npwp' | 'pkp' | 'others';

  @Column()
  taxNumber: string;

  @Column()
  taxName: string;

  @Column({ type: 'text', nullable: true })
  registeredAddress: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isPrimary: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
