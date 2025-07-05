import { Controller, Post, Body, Headers } from '@nestjs/common';
import { XenditService } from './xendit.service';
import { CreateInvoiceDto } from './dto/create-invoice-xendit.dto';

@Controller('webhook')
export class XenditController {
  constructor(private readonly xenditService: XenditService) {}

  @Post('xendit')
  async handleWebhook(@Body() payload: any, @Headers() headers: any) {
    console.log('📩 Webhook received:', payload);

    if (payload.status === 'PAID') {
      // Kamu bisa panggil OrderService di sini (misal lewat Event / Queue)
      // atau inject langsung kalau sudah satu modul
      console.log(`✅ Order ${payload.external_id} dibayar`);
      // await this.orderService.markAsPaid(payload.external_id);
    }

    return { received: true };
  }

  @Post('invoice')
  async createInvoice(@Body() body: CreateInvoiceDto) {
    const result = await this.xenditService.createInvoice(body);
    return {
      invoice_url: result.invoice_url,
      status: result.status,
      id: result.id,
    };
  }
}
