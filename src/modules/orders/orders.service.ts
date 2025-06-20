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
import { MidtransService } from '../midtrans/midtrans.service'; // import MidtransService
import { OrderStatus } from 'src/common/enums/order-status.enum';

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

    private readonly midtransService: MidtransService,
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

  async create(dto: CreateOrderDto): Promise<{ order: Order; snapToken: string }> {
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
      status: OrderStatus.PENDING,
      total,
      items: orderItems,
    });

    const savedOrder = await this.orderRepo.save(order);

    // Setelah simpan order ke DB, langsung buat Snap Token
    const snapToken = await this.midtransService.generateSnapToken({
      orderId: savedOrder.orderNumber,
      amount: total,
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
    });

    return { order: savedOrder, snapToken };
  }

  // Semua order (untuk Admin)
  async findAll(): Promise<{ data: Order[] }> {
    const orders = await this.orderRepo.find({
      relations: ['customer', 'items', 'items.product'],
      order: { orderDate: 'DESC' },
    });
    return { data: orders };
  }

  // Hanya order milik customer tertentu
  async findAllByCustomer(customerId: number): Promise<{ data: Order[] }> {
    const orders = await this.orderRepo.find({
      where: { customer: { id: customerId } },
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

  // untuk midtrans service
  async findOrderById(orderNumber: string): Promise<Order | null> {
    return this.orderRepo.findOne({
      where: { orderNumber },
      relations: ['customer'], // pastikan include customer relation
    });
  }
  
  async updateOrderStatus(orderNumber: string, status: string): Promise<void> {
    const order = await this.orderRepo.findOne({ where: { orderNumber } });
    if (!order) throw new NotFoundException('Order not found');

    // Validasi apakah status termasuk enum OrderStatus
    if (!Object.values(OrderStatus).includes(status as OrderStatus)) {
      throw new BadRequestException(`Invalid order status: ${status}`);
    }

    order.status = status as OrderStatus;
    await this.orderRepo.save(order);
  }
}
