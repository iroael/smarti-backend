import { Injectable, Logger } from '@nestjs/common';
import * as midtransClient from 'midtrans-client';

@Injectable()
export class MidtransService {
  private snap;
  private readonly logger = new Logger(MidtransService.name);

  constructor() {
    this.snap = new midtransClient.Snap({
      isProduction: false,
      serverKey: 'SB-Mid-server-DoA5vmaNj_2fgp4G7Q42xhR1',
      clientKey: 'SB-Mid-client-Q--Pt3_jAV6r0W8r',
    });
  }

  async generateSnapToken(params: {
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
        order_id: params.orderId,
        gross_amount: Math.floor(params.amount), // Harus integer, IDR tidak boleh ada koma
      },
      credit_card: {
        secure: true,
      },
      customer_details: {
        first_name: params.customer.name,
        email: params.customer.email,
        phone: params.customer.phone,
      },
    };

    try {
      const transaction = await this.snap.createTransaction(parameter);
      return transaction.token;
    } catch (error) {
      this.logger.error('Failed to create Snap transaction', error);
      throw error;
    }
  }

  async handleWebhook(notification: any) {
    const orderId = notification.order_id;
    const transactionStatus = notification.transaction_status;

    let status = 'pending';
    if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
      status = 'paid';
    } else if (transactionStatus === 'expire') {
      status = 'expired';
    } else if (transactionStatus === 'cancel' || transactionStatus === 'deny') {
      status = 'failed';
    }

    return { orderId, status };
  }
}
