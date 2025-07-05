import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderPayment, PaymentStatus, PaymentMethod } from 'src/entities/orders/order-payment.entity';
import { CreateOrderPaymentDto } from './dto/create-order-payment.dto';
import { UpdateOrderPaymentDto } from './dto/update-order-payment.dto';
import { OrderStatus } from 'src/common/enums/order-status.enum';
import { Order } from 'src/entities/orders/order.entity';

@Injectable()
export class OrderPaymentService {

  private readonly logger = new Logger(OrderPaymentService.name);

  constructor(
    @InjectRepository(OrderPayment)
    private readonly orderPaymentRepo: Repository<OrderPayment>,

    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  async create(dto: CreateOrderPaymentDto) {
    const order = await this.orderRepo.findOne({ where: { id: dto.orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const payment = this.orderPaymentRepo.create({
      order,
      paymentMethod: dto.paymentMethod,
      amount: dto.amount,
      paymentStatus: dto.paymentStatus || PaymentStatus.UNPAID,
      transactionRef: dto.transactionRef,
      paidAt: dto.paidAt ? new Date(dto.paidAt) : null,
    });

    const saved = await this.orderPaymentRepo.save(payment);
    await this.syncOrderPaymentStatus(dto.orderId);

    return saved;
  }

  async findAll(): Promise<OrderPayment[]> {
    return this.orderPaymentRepo.find();
  }

  async findOne(id: number): Promise<OrderPayment> {
    const payment = await this.orderPaymentRepo.findOne({ where: { id } });
    if (!payment) throw new NotFoundException(`OrderPayment ${id} not found`);
    return payment;
  }

  async update(id: number, dto: UpdateOrderPaymentDto): Promise<OrderPayment> {
    await this.findOne(id); // check exists
    await this.orderPaymentRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.orderPaymentRepo.delete(id);
  }

  // ✅ Sync Order Status with Payments
  async syncOrderPaymentStatus(orderId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['payments'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const totalPaid = order.payments
      .filter((p) => p.paymentStatus === PaymentStatus.PAID)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    if (totalPaid >= Number(order.total)) {
      if (order.status !== OrderStatus.PAID) {
        order.status = OrderStatus.PAID;
        this.logger.log(`Order ${order.orderNumber} marked as PAID`);
      }
    } else if (totalPaid > 0) {
      if (order.status !== OrderStatus.AWAITING_PAYMENT) {
        order.status = OrderStatus.AWAITING_PAYMENT;
        this.logger.log(`Order ${order.orderNumber} marked as AWAITING_PAYMENT`);
      }
    } else {
      if (order.status !== OrderStatus.PENDING) {
        order.status = OrderStatus.PENDING;
        this.logger.log(`Order ${order.orderNumber} marked as PENDING`);
      }
    }

    await this.orderRepo.save(order);
  }
}
