import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductController } from './products.controller';
import { ProductService } from './products.service';
import { Product } from 'src/entities/product.entity';
import { Supplier } from 'src/entities/supplier.entity';
import { ProductPrice } from 'src/entities/product-price.entity';
import { ProductBundleItem } from 'src/entities/product-bundle-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      Supplier,
      ProductPrice,
      ProductBundleItem,
    ]),
  ],
  controllers: [ProductController],
  providers: [ProductService],
})
export class ProductModule {}
