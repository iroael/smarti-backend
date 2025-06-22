import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supplier } from 'src/entities/supplier.entity';
import { Account } from '../../entities/account.entity';
import { BankAccount } from 'src/entities/bank-account.entity';
import { TaxIdentification } from 'src/entities/tax-identifications.entity';
import { SupplierService } from './supplier.service';
import { SupplierController } from './supplier.controller';
import { Addresses } from 'src/entities/address.entity';

@Module({
  imports: [TypeOrmModule.forFeature([
    Supplier,
    Account,
    BankAccount,
    TaxIdentification,
    Addresses
  ])],
  providers: [SupplierService],
  controllers: [SupplierController],
  exports: [SupplierService],
})
export class SupplierModule {}
