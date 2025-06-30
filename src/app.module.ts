import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersModule } from './modules/customers/customers.module';
import { ProductModule } from './modules/product/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { AuthModule } from './modules/auth/auth.module';
import { SupplierModule } from './modules/supplier/supplier.module';
import { AccountsModule } from './modules/account/account.module';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './common/guards/roles.guard';
import { AccessModule } from './modules/access/access.module';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard';
import { AddressModule } from './modules/address/address.module';
import { TaxIdentificationsModule } from './modules/tax/tax-identifications.module';
import { RajaOngkirModule } from './modules/rajaongkir/rajaongkir.module';
import { TaxModule } from './modules/product-taxes/tax.module';
import { ShippingModule } from './modules/shipping/shipping.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [__dirname + '/entities/*.entity{.ts,.js}'],
      synchronize: true,
    }),
    AuthModule,
    CustomersModule,
    SupplierModule,
    AddressModule,
    TaxIdentificationsModule,
    ProductModule,
    TaxModule,
    OrdersModule,
    ShippingModule,
    AccountsModule,
    AccessModule,
    RajaOngkirModule,
  ],
  providers: [
    // {
    //   provide: APP_GUARD,
    //   useClass: JwtAuthGuard, // ← Guard untuk autentikasi JWT
    // },
    {
      provide: APP_GUARD,
      useClass: RolesGuard, // ← Guard untuk role-based authorization
    },
  ],
})
export class AppModule {}
