import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from '../../entities/customer.entity';
import { Account } from '../../entities/account.entity';
import { BankAccount } from 'src/entities/bank-account.entity';
import { TaxIdentification } from 'src/entities/tax-identifications.entity';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { Addresses } from 'src/entities/address.entity';
import { AccurateModule } from 'src/integrate-accurate/accurate/accurate.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,
      Account,
      Addresses,
      BankAccount,
      TaxIdentification,
    ]),
    AccurateModule,
  ],
  providers: [CustomersService],
  controllers: [CustomersController],
  exports: [CustomersService],
})
export class CustomersModule {}
