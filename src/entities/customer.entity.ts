import { Entity, JoinColumn, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, OneToOne } from 'typeorm';

@Entity()
export class Customer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({unique: true, nullable: true})
  customer_code: string;

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

}
