import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Product } from '../product/product.entity';
import { OrderItemTax } from './order-item-tax.entity';

@Entity()
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  // @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  // order: Order;

  // Relasi ke Order (gunakan uuid jika Order pakai uuid)
  @Column()
  orderId: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @ManyToOne(() => Product, { eager: true })
  product: Product;

  @Column()
  quantity: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number; // harga pada saat order

  @OneToMany(() => OrderItemTax, (tax) => tax.orderItem, {
    cascade: true, // <--- penting!
    eager: true,
  })
  taxes: OrderItemTax[];

  @Column({ nullable: true })
  sourceBundleCode?: string;

}
