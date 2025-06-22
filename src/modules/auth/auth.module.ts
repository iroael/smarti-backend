import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { Account } from 'src/entities/account.entity';
import { Customer } from 'src/entities/customer.entity';
import { BankAccount } from 'src/entities/bank-account.entity';
import { TaxIdentification } from 'src/entities/tax-identifications.entity';
import { CustomerAddress } from 'src/entities/customer-address.entity';
import { Addresses } from 'src/entities/address.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forFeature([Account, Customer, BankAccount, TaxIdentification, CustomerAddress, Addresses]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
