import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../entities/order.entity';
import { OrderItem } from '../../entities/order-item.entity';
import { Product } from '../../entities/product.entity';
import { Customer } from '../../entities/customer.entity';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,

    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  async generateOrderNumber(): Promise<string> {
    const datePart = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const prefix = `ORD-${datePart}`;

    const latestOrder = await this.orderRepo
      .createQueryBuilder('order')
      .where('order.orderNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('order.orderNumber', 'DESC')
      .getOne();

    let nextNumber = 1;
    if (latestOrder) {
      const lastNum = parseInt(latestOrder.orderNumber.slice(-5), 10);
      nextNumber = lastNum + 1;
    }

    return `${prefix}-${String(nextNumber).padStart(5, '0')}`;
  }

  async create(dto: CreateOrderDto): Promise<Order> {
    const customer = await this.customerRepo.findOne({
      where: { id: dto.customerId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const orderNumber = await this.generateOrderNumber();
    const orderItems: OrderItem[] = [];
    let total = 0;

    for (const item of dto.items) {
      const product = await this.productRepo.findOne({
        where: { id: item.productId },
        relations: ['prices'],
      });

      if (!product)
        throw new BadRequestException(`Invalid product ID: ${item.productId}`);

      const latestPrice = product.prices?.[product.prices.length - 1];
      if (!latestPrice)
        throw new BadRequestException(
          `No price available for product ID: ${item.productId}`,
        );

      const itemTotal = Number(latestPrice.dpp_jual) * item.quantity;
      total += itemTotal;

      const orderItem = this.orderItemRepo.create({
        product,
        quantity: item.quantity,
        price: latestPrice.dpp_jual,
      });

      orderItems.push(orderItem);
    }

    const order = this.orderRepo.create({
      customer,
      orderNumber,
      orderDate: new Date(),
      status: 'pending',
      total,
      items: orderItems,
    });

    return this.orderRepo.save(order);
  }

  async findAll(): Promise<{ data: Order[] }> {
    const orders = await this.orderRepo.find({
      relations: ['customer', 'items', 'items.product'],
      order: { orderDate: 'DESC' },
    });
    return { data: orders };
  }

  async findOne(id: number): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['customer', 'items', 'items.product'],
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async delete(id: number): Promise<void> {
    const result = await this.orderRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Order not found');
    }
  }
}
