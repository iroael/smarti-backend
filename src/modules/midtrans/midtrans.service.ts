import { Injectable, Logger } from '@nestjs/common';
import * as midtransClient from 'midtrans-client';

@Injectable()
export class MidtransService {
  private snap;
  private readonly logger = new Logger(MidtransService.name);

  constructor() {
    this.snap = new midtransClient.Snap({
      isProduction: false, // Ganti true jika sudah production
      serverKey: 'SB-Mid-server-DoA5vmaNj_2fgp4G7Q42xhR1',
      clientKey: 'SB-Mid-client-Q--Pt3_jAV6r0W8r',
    });
  }

  async generateSnapToken(orderId: string, grossAmount: number) {
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: grossAmount,
      },
      credit_card: {
        secure: true,
      },
      customer_details: {
        first_name: 'Nama Customer',
        email: 'email@example.com',
        phone: '08123456789',
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

  async handleWebhook(notification: any): Promise<{ orderId: string; status: string }> {
    const transactionStatus = notification.transaction_status;
    const orderId = notification.order_id;

    let status = 'UNPAID';
    if (transactionStatus === 'settlement') {
      status = 'PAID';
    } else if (transactionStatus === 'cancel' || transactionStatus === 'expire' || transactionStatus === 'failure') {
      status = 'FAILED';
    } else if (transactionStatus === 'pending') {
      status = 'PENDING';
    }

    return { orderId, status };
  }
}
