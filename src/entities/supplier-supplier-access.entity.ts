import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { Supplier } from './supplier.entity';

@Entity('supplier_supplier_access')
export class SupplierSupplierAccess {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Supplier, { onDelete: 'CASCADE' })
  viewer: Supplier; // Supplier yang bisa melihat

  @ManyToOne(() => Supplier, { onDelete: 'CASCADE' })
  target: Supplier; // Supplier yang produknya bisa dilihat

  @CreateDateColumn()
  createdAt: Date;
}
