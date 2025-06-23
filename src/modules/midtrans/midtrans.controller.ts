import { Controller, Get, Query, Post, Req, Res, HttpStatus, Logger } from '@nestjs/common';
import { MidtransService } from './midtrans.service';
import { OrdersService } from '../orders/orders.service';
import { Request, Response } from 'express';

@Controller('midtrans')
export class MidtransController {
  private readonly logger = new Logger(MidtransController.name);

  constructor(
    private readonly midtransService: MidtransService,
    private readonly ordersService: OrdersService,
  ) {}

  @Get('token')
  async getSnapToken(@Query('orderId') orderId: string) {
    const order = await this.ordersService.findOrderById(orderId);
    if (!order) {
      return { error: 'Order not found' };
    }
    if (!order.customer) {
      return { error: 'Customer info not available for this order' };
    }

    const token = await this.midtransService.generateSnapToken({
      orderId: order.orderNumber,
      amount: order.total,
      customer: {
        name: order.customer.name,
        email: order.customer.email,
        phone: order.customer.phone,
      },
    });

    return { token };
  }

  @Post('webhook')
  async webhookHandler(@Req() req: Request, @Res() res: Response) {
    try {
      const notification = req.body;
      const { orderId, status } = await this.midtransService.handleWebhook(notification);

      await this.ordersService.updateOrderStatus(orderId, status);
      this.logger.log(`Updated order ${orderId} to status ${status}`);
      return res.status(HttpStatus.OK).json({ received: true });
    } catch (error) {
      this.logger.error('Webhook processing failed', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Processing failed' });
    }
  }
}
