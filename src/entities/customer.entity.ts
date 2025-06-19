import { Entity, JoinColumn, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, OneToOne } from 'typeorm';
import { Order } from './order.entity';
import { Account } from './account.entity';
import { CustomerAddress } from './customer-address.entity';

@Entity()
export class Customer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  phone: string;

  @Column({ unique: true })
  npwp: string;

  @Column()
  province: string;

  @Column()
  city: string;

  @Column()
  postalcode: string;

  @Column('text')
  address: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Order, (order) => order.customer)
  orders: Order[];

  @OneToOne(() => Account, (account) => account.customer, {
    cascade: true,
    nullable: true,
  })
  @JoinColumn()
  account?: Account;

  @OneToMany(() => CustomerAddress, (addr) => addr.customer, {
    cascade: true,
  })
  addresses: CustomerAddress[];

}
