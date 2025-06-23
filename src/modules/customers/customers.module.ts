import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from '../../entities/customer.entity';
import { Account } from '../../entities/account.entity';
import { CustomerAddress } from '../../entities/customer-address.entity';
import { BankAccount } from 'src/entities/bank-account.entity';
import { TaxIdentification } from 'src/entities/tax-identifications.entity';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { Addresses } from 'src/entities/address.entity';

@Module({
  imports: [TypeOrmModule.forFeature([
    Customer,
    Account,
    CustomerAddress,
    Addresses,
    BankAccount,
    TaxIdentification,
  ])],
  providers: [CustomersService],
  controllers: [CustomersController],
  exports: [CustomersService],
})
export class CustomersModule {}
