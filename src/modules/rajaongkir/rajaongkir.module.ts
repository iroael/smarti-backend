import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RajaOngkirService } from './rajaongkir.service';
import { RajaOngkirController } from './rajaongkir.controller';

@Module({
  imports: [HttpModule],
  controllers: [RajaOngkirController],
  providers: [RajaOngkirService],
  exports: [RajaOngkirService],
})
export class RajaOngkirModule {}
