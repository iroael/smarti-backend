import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as qs from 'qs';

@Injectable()
export class XenditService {
  private readonly baseUrl = 'https://api.xendit.co/v2/invoices';
  private readonly secretKey = process.env.XENDIT_API_KEY;

  constructor(private readonly http: HttpService) {}

  async createInvoice({
    externalId,
    amount,
    payerEmail,
    description,
  }: {
    externalId: string;
    amount: number;
    payerEmail?: string;
    description?: string;
  }): Promise<any> {
    const data = {
      external_id: externalId,
      amount,
      payer_email: payerEmail || 'customer@email.com',
      description: description || 'Order payment',
    };

    console.log('Xendit createInvoice data:', data);
    console.log('Xendit createInvoice secretKey:', this.secretKey);

    const auth = Buffer.from(`${this.secretKey}:`).toString('base64');

    const response = await firstValueFrom(
      this.http.post(this.baseUrl, data, {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      }),
    );

    return response.data;
  }
}
