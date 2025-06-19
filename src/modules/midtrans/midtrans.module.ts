import { Module, forwardRef } from '@nestjs/common';
import { MidtransService } from './midtrans.service';
import { MidtransController } from './midtrans.controller';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [forwardRef(() => OrdersModule)],
  providers: [MidtransService],
  controllers: [MidtransController],
  exports: [MidtransService],
})
export class MidtransModule {}
