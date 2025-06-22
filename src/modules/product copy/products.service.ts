import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Product } from 'src/entities/product.entity';
import { ProductPrice } from 'src/entities/product-price.entity';
import { ProductBundleItem } from 'src/entities/product-bundle-item.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Supplier } from 'src/entities/supplier.entity';
import { CustomerSupplierAccess } from 'src/entities/customer-supplier-access.entity';
import { SupplierSupplierAccess } from 'src/entities/supplier-supplier-access.entity';
import { Role } from 'src/common/enums/role.enum';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(Supplier) private supplierRepo: Repository<Supplier>,
    @InjectRepository(ProductPrice) private priceRepo: Repository<ProductPrice>,
    @InjectRepository(ProductBundleItem) private bundleRepo: Repository<ProductBundleItem>,

    @InjectRepository(CustomerSupplierAccess)
    private readonly customerSupplierAccessRepo: Repository<CustomerSupplierAccess>,

    @InjectRepository(SupplierSupplierAccess)
    private readonly supplierSupplierAccessRepo: Repository<SupplierSupplierAccess>,
  ) {}

  async create(dto: CreateProductDto): Promise<Product> {
    const supplier = await this.supplierRepo.findOne({
      where: { id: dto.supplier_id },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const product = this.productRepo.create({
      product_code: dto.product_code,
      name: dto.name,
      description: dto.description,
      stock: dto.stock,
      is_bundle: dto.is_bundle,
      supplier,
    });

    const savedProduct = await this.productRepo.save(product);

    // Jika produk BUNDLE -> hitung harga otomatis
    if (dto.is_bundle && dto.bundleItems?.length) {
      let totalDppBeli = 0;
      let totalDppJual = 0;
      let totalHJualB = 0;

      for (const item of dto.bundleItems) {
        const product = await this.productRepo.findOne({
          where: { id: item.product_id },
          relations: ['prices'],
        });

        if (!product)
          throw new NotFoundException(`Product ID ${item.product_id} not found`);

        const latestPrice = product.prices?.[product.prices.length - 1];
        if (!latestPrice)
          throw new NotFoundException(
            `Price not found for product ID ${item.product_id}`,
          );

        totalDppBeli += +latestPrice.dpp_beli * item.quantity;
        totalDppJual += +latestPrice.dpp_jual * item.quantity;
        totalHJualB += +latestPrice.h_jual_b * item.quantity;

        const bundleItem = this.bundleRepo.create({
          bundle: savedProduct,
          product,
          quantity: item.quantity,
        });
        await this.bundleRepo.save(bundleItem);
      }

      // Simpan harga otomatis hasil kalkulasi
      const price = this.priceRepo.create({
        dpp_beli: totalDppBeli,
        dpp_jual: totalDppJual,
        h_jual_b: totalHJualB,
        product: savedProduct,
      });
      await this.priceRepo.save(price);
    } else {
      // Jika bukan bundle, simpan harga dari DTO
      const price = this.priceRepo.create({
        ...dto.price,
        product: savedProduct,
      });
      await this.priceRepo.save(price);
    }

    return this.findOne(savedProduct.id);
  }

  async findAll(user: { role: Role; customerId?: number; supplierId?: number }) {
    let supplierIds: number[] = [];

    console.log('📥 [findAll] Incoming user:', user);

    if (user.role === Role.Customer) {
      if (!user.customerId) throw new NotFoundException('Customer ID is required');

      const access = await this.customerSupplierAccessRepo.find({
        where: { customer: { id: user.customerId } },
        relations: ['supplier'],
      });

      supplierIds = access.map((a) => a.supplier.id);
      console.log('📦 Allowed supplier IDs for customer:', supplierIds);
      // Jika customer tidak memiliki akses ke supplier manapun, return empty
      if (supplierIds.length === 0) {
        return { data: [] };
      }
    }

    if (user.role === Role.Supplier) {
      if (!user.supplierId) throw new NotFoundException('Supplier ID is required');

      // Supplier dapat melihat produk mereka sendiri
      supplierIds = [user.supplierId];
      // Jika ada akses ke supplier lain, tambahkan juga
      const access = await this.supplierSupplierAccessRepo.find({
        where: { viewer: { id: user.supplierId } },
        relations: ['target'],
      });

      const additionalSupplierIds = access.map((a) => a.target.id);
      supplierIds = [...supplierIds, ...additionalSupplierIds];
      console.log('📦 Allowed supplier IDs for supplier view:', supplierIds);
    }

    // Jika user adalah admin atau role lain, tampilkan semua produk
    if (user.role !== Role.Customer && user.role !== Role.Supplier) {
      console.log('📌 Admin/Other role - showing all products');
      const products = await this.productRepo.find({
        relations: [
          'supplier',
          'prices',
          'bundleItems',
          'bundleItems.product',
          'bundleItems.product.prices',
        ],
        order: { created_at: 'DESC' },
      });
      return { data: products };
    }

    const whereCondition = { supplier: { id: In(supplierIds) } };
    console.log('📌 Final where condition for product query:', whereCondition);

    const products = await this.productRepo.find({
      where: whereCondition,
      relations: [
        'supplier',
        'prices',
        'bundleItems',
        'bundleItems.product',
        'bundleItems.product.prices',
      ],
      order: { created_at: 'DESC' },
    });

    return { data: products };
  }


  async findOne(id: number) {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['supplier', 'prices', 'bundleItems', 'bundleItems.product'],
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(id: number, dto: UpdateProductDto): Promise<Product> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    Object.assign(product, dto);
    return this.productRepo.save(product);
  }

  async remove(id: number): Promise<void> {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['bundleItems'],
    });

    if (!product) throw new NotFoundException('Product not found');

    // Cek apakah produk ini digunakan dalam bundle lain
    const isUsedInOtherBundle = await this.bundleRepo.findOne({
      where: { product: { id } },
    });

    if (isUsedInOtherBundle) {
      throw new Error(
        'Product cannot be deleted because it is part of a bundle.',
      );
    }

    // Hapus harga terkait
    await this.priceRepo.delete({ product: { id } });

    // Hapus relasi bundleItems jika produk ini adalah bundle
    await this.bundleRepo.delete({ bundle: { id } });

    // Hapus produk
    await this.productRepo.delete(id);
  }

}
