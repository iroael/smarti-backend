import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { CreateItemDto } from './dto/create-item.dto';

@Injectable()
export class AccurateService {
  constructor(private readonly httpService: HttpService) {}
  private readonly signatureVendor = 'q2k4CAb6zFmVjquNkheEw5Jk7o9P15EQ4s2stYSH09uyWCWCKm1aecTha1pyCVXD'; // langsung didefinisikan di class
  private readonly token = 'aat.NTA.eyJ2IjoxLCJ1Ijo5MzA4NDksImQiOjE5MzQzOTYsImFpIjo1NzAwMiwiYWsiOiJlNzJiMmRlMS0wZmI3LTQ0N2ItOTI3Ny01ZjQyMzc5NTc0YWIiLCJhbiI6Imtpc3NUZXN0IiwiYXAiOiJiYTZjMTZmMy00MzQzLTRlODEtYjYxZC1iYjJiMjc2YjlmNmYiLCJ0IjoxNzUxNjAxMjExNzAyfQ.XoIX2cMc0qZrCTTnM2FcBsE/XjUUqOIo+pTonP/2rzPaYxN6XemyK0OJsmy1ZAq+29EblFqb4Gq8idEDLB5oA72teTxm2tGMPb5zrC16vX4c/o+qmfGae+YNWmMLC8BMApLD1CSZD4pYS2QxH+MZGcp37CiUn+Lj3LPGbl6y2SfflO934LhO3mC+OjUwgV6qT5UE9U45b40=.rqbPaNiRtzhMPZiDGDs0z0B9HHv7yObKCB+DNj2Eijc'; // token static, atau dari login awal

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

  async deleteVendor(vendorNo: string) {
    const url = `https://zeus.accurate.id/accurate/api/vendor/delete.do?vendorNo=${vendorNo}`;
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
        error?.response?.data?.message || 'Failed to delete vendor from Accurate'
      );
    }
  }

  // simpan customer / pelanggan ke Accurate
  async addCustomerToAccurate(payload: any): Promise<any> {
    // console.log('Saving customer to Accurate:', payload);
    // Pastikan payload sudah sesuai dengan struktur yang diharapkan Accurate
    const url = 'https://zeus.accurate.id/accurate/api/customer/save.do';

    const headers = {
      Authorization: `Bearer ${this.token}`,
      ...this.getAccurateHeaders(this.signatureVendor),
    };

    try {
      const response$ = this.httpService.post(url, payload, { headers });
      const response = await firstValueFrom(response$);
      console.log('response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Accurate vendor save failed:', error?.response?.data || error.message);
      throw new Error('Failed to save vendor to Accurate');
    }
  }

  // delete customer / pelanggan dari Accurate
  async deleteCustomer(customerNo: string) {
    const url = `https://zeus.accurate.id/accurate/api/customer/delete.do?customerNo=${customerNo}`;
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
        error?.response?.data?.message || 'Failed to delete customer from Accurate'
      );
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

  async createSalesOrder(payload: any): Promise<void> {
    const url = 'https://zeus.accurate.id/accurate/api/sales-order/save.do';
    const headers = {
      Authorization: `Bearer ${this.token}`,
      ...this.getAccurateHeaders(this.signatureVendor),
    };
    try {
      // Pastikan dto sudah sesuai dengan struktur yang diharapkan Accurate

      console.log('Saving sales to Accurate:', payload);
      const response$ = this.httpService.post(url, payload, { headers });
      const response = await firstValueFrom(response$);
      return response.data;
    } catch (error) {
      console.error('Accurate item save failed:', error?.response?.data || error.message);
      throw new Error('Failed to save item to Accurate');
    }
  }
}
