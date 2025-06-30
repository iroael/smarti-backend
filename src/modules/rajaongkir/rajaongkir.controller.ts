import { Controller, Get, Query, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
  ApiResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { RajaOngkirService } from './rajaongkir.service';
import { CheckCostDto } from './dto/check-cost.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Order Calculate')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shipping')
export class RajaOngkirController {
  constructor(private readonly komerceService: RajaOngkirService) {}

  @Get('destination')
  @ApiOperation({ summary: 'Cari kota/kecamatan tujuan pengiriman domestik' })
  @ApiQuery({ name: 'search', required: true, description: 'Nama kota/kecamatan, misal: sinduharjo' })
  @ApiQuery({ name: 'limit', required: false, description: 'Jumlah maksimal hasil', example: 10 })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset untuk pagination', example: 0 })
  @ApiResponse({ status: 200, description: 'Daftar tujuan ditemukan' })
  @ApiResponse({ status: 400, description: 'Parameter tidak valid' })
  async getDestination(
    @Query('search') search: string,
    @Query('limit') limit = 10,
    @Query('offset') offset = 0,
  ) {
    return this.komerceService.searchDestination(search, limit, offset);
  }

  @Post('cost')
  @ApiOperation({ summary: 'Cek ongkos kirim domestik berdasarkan kurir' })
  @ApiBody({ type: CheckCostDto })
  @ApiResponse({ status: 200, description: 'Biaya pengiriman berhasil dihitung' })
  @ApiResponse({ status: 400, description: 'Data request tidak valid' })
  async checkCost(@Body() body: CheckCostDto) {
    return this.komerceService.calculateDomesticCost(body);
  }

  @Get('track')
  @ApiOperation({ summary: 'Lacak resi pengiriman (Waybill Tracking)' })
  @ApiQuery({ name: 'awb', required: true, description: 'Nomor resi (waybill)' })
  @ApiQuery({ name: 'courier', required: true, description: 'Kode kurir, contoh: jne, tiki, jnt, sicepat' })
  @ApiResponse({ status: 200, description: 'Status pengiriman berhasil diambil' })
  @ApiResponse({ status: 400, description: 'Parameter tidak valid' })
  async trackWaybill(
    @Query('awb') awb: string,
    @Query('courier') courier: string,
  ) {
    return this.komerceService.trackWaybill(awb, courier);
  }
}
