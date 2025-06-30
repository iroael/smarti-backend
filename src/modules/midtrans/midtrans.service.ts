import { Inject, forwardRef, Injectable, Logger } from '@nestjs/common';
import * as midtransClient from 'midtrans-client';
import { OrdersService } from '../orders/orders.service';
import { Order } from 'src/entities/order.entity';


@Injectable()
export class MidtransService {
  private readonly logger = new Logger(MidtransService.name);
  private readonly snap;
  private readonly transaction;

  constructor(
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
  ) {
    this.snap = new midtransClient.Snap({
      isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY,
    });

    this.transaction = new midtransClient.CoreApi({
      isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY,
    });
  }

  /**
   * ✅ Generate Snap Token Baru
   */
  async generateSnapToken(data: {
    orderId: string;
    amount: number;
    customer: {
      name: string;
      email: string;
      phone: string;
    };
  }): Promise<string> {
    const parameter = {
      transaction_details: {
        order_id: data.orderId,
        gross_amount: Math.floor(data.amount), // Harus integer
      },
      customer_details: {
        first_name: data.customer.name,
        email: data.customer.email,
        phone: data.customer.phone,
      },
      credit_card: {
        secure: true,
      },
    };

    const transaction = await this.snap.createTransaction(parameter);
    this.logger.log(`Generated Snap Token for ${data.orderId}`);
    return transaction.token;
  }

  getSnap() {
    return this.snap;
  }

  /**
   * ✅ Check Transaction Status dari Midtrans
   */
  async checkTransactionStatus(orderId: string): Promise<string | null> {
    try {
      const response = await this.transaction.transaction.status(orderId);
      return response.transaction_status;
    } catch (error) {
      this.logger.warn(`Failed to check status for ${orderId}: ${error.message}`);
      return null;
    }
  }

  /**
   * ✅ Get SnapToken yang valid
   * Jika sudah expired → auto-generate baru
   */
  async getValidSnapToken(order: Order): Promise<string> {
    if (!order.customer) {
      throw new Error('Customer information is required to generate SnapToken');
    }

    if (order.snapToken) {
      const status = await this.checkTransactionStatus(order.orderNumber);
      if (status === 'pending') {
        return order.snapToken;
      }
    }

    const newToken = await this.generateSnapToken({
      orderId: order.orderNumber,
      amount: order.total,
      customer: {
        name: order.customer.name,
        email: order.customer.email,
        phone: order.customer.phone,
      },
    });

    await this.ordersService.updateSnapToken(order.id, newToken);
    return newToken;
  }


  /**
   * ✅ Handle Webhook dari Midtrans
   */
  async handleWebhook(notification: any): Promise<{ orderId: string; status: string }> {
    const statusResponse = await this.transaction.transaction.notification(notification);
    const transactionStatus = statusResponse.transaction_status;
    const fraudStatus = statusResponse.fraud_status;
    const orderId = statusResponse.order_id;

    this.logger.log(`Webhook received for order ${orderId} → status ${transactionStatus}`);

    let newStatus: string = 'pending'; // 🔥 Default value untuk menghindari error

    switch (transactionStatus) {
      case 'capture':
        if (fraudStatus === 'challenge') {
          newStatus = 'awaiting_payment';
        } else if (fraudStatus === 'accept') {
          newStatus = 'paid';
        }
        break;
      case 'settlement':
        newStatus = 'paid';
        break;
      case 'pending':
        newStatus = 'awaiting_payment';
        break;
      case 'deny':
      case 'cancel':
      case 'expire':
        newStatus = 'cancelled';
        break;
      case 'refund':
        newStatus = 'refunded';
        break;
      default:
        this.logger.warn(`Unhandled transaction status: ${transactionStatus}`);
        newStatus = 'pending'; // Atau bisa throw error jika mau ketat
        break;
    }

    await this.ordersService.updateOrderStatus(orderId, newStatus);

    return { orderId, status: transactionStatus };
  }

}
