import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { CreateItemDto } from './dto/create-item.dto';

@Injectable()
export class AccurateService {
  constructor(private readonly httpService: HttpService) {}
  private readonly signatureVendor = 'aaa'; // langsung didefinisikan di class
  private readonly token = 'xxx'; // token static, atau dari login awal

  /**
   * Menghasilkan header Accurate (signature & timestamp),
   * optional: signature jika ingin kirim signature headers.
   */
  private getAccurateHeaders(secret?: string): Record<string, string> {
    const headers: Record<string, string> = {};

    if (secret) {
      const timestamp = new Date().toISOString();
      const signature = crypto
        .createHmac('sha256', secret)
        .update(timestamp)
        .digest('hex');

      headers['X-Api-Timestamp'] = timestamp;
      headers['X-Api-Signature'] = signature;
    }

    return headers;
  }

  /**
   * Ambil informasi token session dari Accurate
   */
  async getAuthInfo(token: string): Promise<any> {
    const url = 'https://account.accurate.id/api/auth-info.do';

    const headers = {
      Authorization: `Bearer ${token}`,
      ...this.getAccurateHeaders(this.signatureVendor),
    };

    const response$ = this.httpService.get(url, { headers });
    const response = await firstValueFrom(response$);
    return response.data;
  }

  /**
   * Kirim vendor (supplier) ke Accurate
   */
  async addVendorToAccurate(payload: any): Promise<any> {
    const url = 'https://zeus.accurate.id/accurate/api/vendor/save.do';

    const headers = {
      Authorization: `Bearer ${this.token}`,
      ...this.getAccurateHeaders(this.signatureVendor),
    };

    try {
      const response$ = this.httpService.post(url, payload, { headers });
      console.log('Saving vendor to Accurate:', payload);
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      console.error('Accurate vendor save failed:', error?.response?.data || error.message);
      throw new Error('Failed to save vendor to Accurate');
    }
  }

  async saveItem(dto: CreateItemDto): Promise<any> {
    const url = 'https://zeus.accurate.id/accurate/api/item/save.do';
    const headers = {
      Authorization: `Bearer ${this.token}`,
      ...this.getAccurateHeaders(this.signatureVendor),
    };
    try {
      // Pastikan dto sudah sesuai dengan struktur yang diharapkan Accurate

    console.log('Saving item to Accurate:', dto);
      const response$ = this.httpService.post(url, dto, { headers });
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      console.error('Accurate item save failed:', error?.response?.data || error.message);
      throw new Error('Failed to save item to Accurate');
    }
  }

  async deleteItem(kodeBarang: string) {
    const url = `https://zeus.accurate.id/accurate/api/item/delete.do?no=${kodeBarang}`;
    const headers = {
      Authorization: `Bearer ${this.token}`,
      ...this.getAccurateHeaders(this.signatureVendor),
    };

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(url, null, { headers }),
      );
      return data;
    } catch (error) {
      throw new Error(
        error?.response?.data?.message || 'Failed to delete item from Accurate'
      );
    }
  }
}
