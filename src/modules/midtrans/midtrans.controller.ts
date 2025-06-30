import {
  Controller,
  Get,
  Query,
  Post,
  Req,
  Res,
  HttpStatus,
  Logger,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { MidtransService } from './midtrans.service';
import { OrdersService } from '../orders/orders.service';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Midtrans')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard, RolesGuard)
@Controller('midtrans')
export class MidtransController {
  private readonly logger = new Logger(MidtransController.name);

  constructor(
    private readonly midtransService: MidtransService,
    private readonly ordersService: OrdersService,
  ) {}

  /**
   * ✅ Get Snap Token
   */
  @Get('token')
  async getSnapToken(@Query('orderId') orderId: string) {
    const order = await this.ordersService.findOrderById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (!order.customer) {
      throw new NotFoundException('Customer not found in order');
    }

    const snapToken = await this.midtransService.getValidSnapToken(order);
    return { snapToken };
  }

  /**
   * ✅ Check Transaction Status
   */
  @Get('status')
  @ApiOperation({ summary: 'Get Transaction Status by Order ID' })
  @ApiQuery({ name: 'orderId', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Transaction status retrieved' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getTransactionStatus(@Query('orderId') orderId: string) {
    const order = await this.ordersService.findOrderById(orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const status = await this.midtransService.checkTransactionStatus(order.orderNumber);

    return {
      success: true,
      message: 'Transaction status retrieved',
      data: {
        orderId: order.orderNumber,
        status,
      },
    };
  }

  /**
   * ✅ Webhook Handler
   */
  @Post('webhook')
  @ApiOperation({ summary: 'Midtrans Webhook Endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 500, description: 'Webhook processing failed' })
  async webhookHandler(@Req() req: Request, @Res() res: Response) {
    try {
      const notification = req.body;

      const { orderId, status } = await this.midtransService.handleWebhook(notification);

      await this.ordersService.updateOrderStatus(orderId, status);

      this.logger.log(`✅ Webhook processed: Order ${orderId} updated to ${status}`);

      return res.status(HttpStatus.OK).json({
        success: true,
        message: `Order ${orderId} updated to ${status}`,
      });
    } catch (error) {
      this.logger.error('❌ Webhook processing failed', error);

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Webhook processing failed',
        error: error.message,
      });
    }
  }
}
