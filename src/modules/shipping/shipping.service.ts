import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shipping } from 'src/entities/shipping.entity';
import { CreateShippingDto } from './dto/create-shipping.dto';
import { UpdateShippingDto } from './dto/update-shipping.dto';
import { Order } from 'src/entities/orders/order.entity';

@Injectable()
export class ShippingService {
  constructor(
    @InjectRepository(Shipping)
    private shippingRepo: Repository<Shipping>,

    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
  ) {}

  async create(dto: CreateShippingDto): Promise<Shipping> {
    const order = await this.orderRepo.findOne({ where: { id: dto.orderId } });
    if (!order) throw new NotFoundException('Order not found');

    const shipping = this.shippingRepo.create({
      ...dto,
      order,
    });

    return this.shippingRepo.save(shipping);
  }

  findAll(): Promise<Shipping[]> {
    return this.shippingRepo.find();
  }

  async findOne(id: number): Promise<Shipping> {
    const shipping = await this.shippingRepo.findOne({ where: { id } });
    if (!shipping) throw new NotFoundException('Shipping not found');
    return shipping;
  }

  async update(id: number, dto: UpdateShippingDto): Promise<Shipping> {
    const shipping = await this.findOne(id);

    if (dto.orderId) {
      const order = await this.orderRepo.findOne({ where: { id: dto.orderId } });
      if (!order) throw new NotFoundException('Order not found');
      shipping.order = order;
    }

    Object.assign(shipping, dto);
    return this.shippingRepo.save(shipping);
  }

  async findByOrderId(orderId: string) {
    return this.shippingRepo.find({
      where: {
        order: {
          id: orderId,
        },
      },
      relations: ['order'], // optional, kalau ingin include detail order
    });
  }

  async remove(id: number): Promise<void> {
    const shipping = await this.findOne(id);
    await this.shippingRepo.remove(shipping);
  }
}
