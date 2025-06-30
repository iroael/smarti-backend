import {
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as qs from 'qs';

@Injectable()
export class RajaOngkirService {
  private readonly KOMERCE_API_URL: string;
  private readonly KOMERCE_API_KEY: string;

  private readonly BINDERBYTE_API_URL = 'https://api.binderbyte.com/v1/track';
  private readonly BINDERBYTE_API_KEY: string;

  constructor(
    private config: ConfigService,
    private readonly httpService: HttpService, // ← Ini penting!
  ) {
    this.KOMERCE_API_URL = this.config.get('KOMERCE_API_URL') || '';
    this.KOMERCE_API_KEY = this.config.get('KOMERCE_API_KEY') || '';

    this.BINDERBYTE_API_KEY = this.config.get('BINDERBYTE_API_KEY') || '';

    if (!this.KOMERCE_API_URL || !this.KOMERCE_API_KEY) {
        console.warn('🚨 KOMERCE_API_URL atau KOMERCE_API_KEY belum dikonfigurasi dengan benar.');
    }
  }

  async searchDestination(search: string, limit = 10, offset = 0) {
    try {
      const response = await axios.get(
        `${this.KOMERCE_API_URL}/destination/domestic-destination`,
        {
          params: { search, limit, offset },
          headers: { key: this.KOMERCE_API_KEY },
        },
      );
      return response.data;
    } catch (error) {
      console.error('Error searching destination:', error.response?.data || error.message);
      throw error;
    }
  }

  async calculateDomesticCost(form: {
    origin: string;
    destination: string;
    weight: number;
    courier: string;
    price: string;
  }) {
    const data = qs.stringify(form);

    const response = await axios.post(
      `${this.KOMERCE_API_URL}/calculate/domestic-cost`,
      data,
      {
        headers: {
          key: this.KOMERCE_API_KEY,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    return response.data;
  }

  async trackWaybill(
    courier: string,
    awb: string,
    source: 'komerce' | 'binderbyte' = 'komerce',
  ): Promise<any> {
    console.log(courier, awb, source);
    if (source === 'binderbyte') {
      return this.trackWithBinderByte(courier, awb);
    }
    return this.trackWithKomerce(courier, awb);
  }

  private async trackWithKomerce(awb: string, courier: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.KOMERCE_API_URL}/track/waybill`,
          null,
          {
            params: { awb, courier },
            headers: {
              key: this.KOMERCE_API_KEY,
            },
          },
        ),
      );
      return response.data;
    } catch (error) {
      throw new HttpException(
        error.response?.data?.message || error.message,
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async trackWithBinderByte(courier: string, awb: string) {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(this.BINDERBYTE_API_URL, {
          params: {
            api_key: this.BINDERBYTE_API_KEY,
            courier: courier,
            awb: awb,
          },
        }),
      );

      if (data.status !== 200) {
        throw new HttpException(data.message, HttpStatus.BAD_REQUEST);
      }

      return data.data;
    } catch (error) {
      throw new HttpException(
        error.response?.data?.message || error.message,
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
