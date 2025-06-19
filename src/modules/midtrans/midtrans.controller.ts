import { Controller, Get, Query, Post, Req, Res, HttpStatus } from '@nestjs/common';
import { MidtransService } from './midtrans.service';
import { Request, Response } from 'express';
import { OrdersService } from '../orders/orders.service';

@Controller('midtrans')
export class MidtransController {
  constructor(
    private readonly midtransService: MidtransService,
    private readonly orderService: OrdersService, // service kamu untuk update order
  ) {}

  @Get('token')
  async getSnapToken(@Query('orderId') orderId: string, @Query('amount') amount: string) {
    const token = await this.midtransService.generateSnapToken(orderId, parseInt(amount));
    return { token };
  }

  @Post('webhook')
  async webhookHandler(@Req() req: Request, @Res() res: Response) {
    const notification = req.body;
    const { orderId, status } = await this.midtransService.handleWebhook(notification);

    // Update order status di database kamu
    await this.orderService.updateOrderStatus(orderId, status);

    res.status(HttpStatus.OK).json({ received: true });
  }
}
