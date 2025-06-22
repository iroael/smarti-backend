import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessService } from './access.service';
import { AccessController } from './access.controller';
import { CustomerSupplierAccess } from 'src/entities/customer-supplier-access.entity';
import { SupplierSupplierAccess } from 'src/entities/supplier-supplier-access.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerSupplierAccess, SupplierSupplierAccess])],
  providers: [AccessService],
  controllers: [AccessController],
})
export class AccessModule {}
