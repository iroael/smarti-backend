// src/entities/tax.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('taxes')
export class Tax {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string; // e.g. 'PPN'

  @Column()
  description: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  rate: number; // e.g. 11.00 = 11%
}
