// tax-identifications.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('addresses')
@Index(['ownerType', 'ownerId'])
export class Addresses {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: ['customer', 'supplier'] })
  ownerType: 'customer' | 'supplier';

  @Column()
  ownerId: number;

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

  @Column({ default: false, type: 'boolean' })
  is_deleted: boolean;

  @Column({ default: false, type: 'boolean' })
  is_default: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
