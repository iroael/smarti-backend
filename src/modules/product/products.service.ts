import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Product } from 'src/entities/product.entity';
import { ProductPrice } from 'src/entities/product-price.entity';
import { ProductBundleItem } from 'src/entities/product-bundle-item.entity';
import { ProductTax } from 'src/entities/product-tax.entity';
import { Tax } from 'src/entities/tax.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Supplier } from 'src/entities/supplier.entity';
import { CustomerSupplierAccess } from 'src/entities/customer-supplier-access.entity';
import { SupplierSupplierAccess } from 'src/entities/supplier-supplier-access.entity';
import { Role } from 'src/common/enums/role.enum';

// Enum untuk tipe produk yang ingin ditampilkan
export enum ProductViewType {
  MY_PRODUCTS = 'my_products',        // Produk milik sendiri
  CATALOG = 'catalog',                // Produk katalog (dari supplier lain)
  ALL = 'all',                        // Semua produk (untuk admin)
  SPECIFIC_SUPPLIER = 'specific_supplier' // Produk dari supplier tertentu
}

interface FindProductsOptions {
  viewType: ProductViewType;
  specificSupplierId?: number; // Untuk ProductViewType.SPECIFIC_SUPPLIER
}

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(Supplier) private supplierRepo: Repository<Supplier>,
    @InjectRepository(ProductPrice) private priceRepo: Repository<ProductPrice>,
    @InjectRepository(ProductBundleItem) private bundleRepo: Repository<ProductBundleItem>,
    @InjectRepository(ProductTax) private readonly productTaxRepo: Repository<ProductTax>,
    @InjectRepository(Tax) private readonly taxRepo: Repository<Tax>,
    @InjectRepository(CustomerSupplierAccess)
    private readonly customerSupplierAccessRepo: Repository<CustomerSupplierAccess>,

    @InjectRepository(SupplierSupplierAccess)
    private readonly supplierSupplierAccessRepo: Repository<SupplierSupplierAccess>,
  ) {}

  /**
   * SINGLE FUNCTION untuk semua kebutuhan find products
   * Scalable untuk berbagai use case
   */
  async findProducts(
    user: { role: Role; customerId?: number; supplierId?: number },
    options: FindProductsOptions
  ) {
    const { viewType, specificSupplierId } = options;
    let supplierIds: number[] = [];

    // console.log('📥 [findProducts] User:', user, 'Options:', options);

    switch (viewType) {
      case ProductViewType.MY_PRODUCTS:
        supplierIds = await this.getMyProductSuppliers(user);
        break;

      case ProductViewType.CATALOG:
        supplierIds = await this.getCatalogSuppliers(user);
        break;

      case ProductViewType.ALL:
        supplierIds = await this.getAllSuppliers();
        break;

      case ProductViewType.SPECIFIC_SUPPLIER:
        if (!specificSupplierId) {
          throw new NotFoundException('Specific supplier ID is required');
        }
        supplierIds = await this.getSpecificSupplier(user, specificSupplierId);
        break;

      default:
        throw new NotFoundException('Invalid view type');
    }

    if (supplierIds.length === 0) {
      // console.log('📦 No supplier access found');
      return { data: [] };
    }

    const whereCondition = supplierIds.length === 1 && viewType === ProductViewType.ALL
      ? {} // Untuk admin, tampilkan semua produk tanpa filter
      : { supplier: { id: In(supplierIds) } };

    // console.log('📌 Final supplier IDs:', supplierIds);
    // console.log('📌 Where condition:', whereCondition);

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

    // console.log(`📦 Found ${products.length} products`);
    return { data: products };
  }

  /**
   * Helper: Dapatkan supplier untuk produk milik sendiri
   */
  private async getMyProductSuppliers(user: { role: Role; customerId?: number; supplierId?: number }): Promise<number[]> {
    if (user.role === Role.Supplier) {
      if (!user.supplierId) throw new NotFoundException('Supplier ID is required');
      return [user.supplierId];
    }

    if (user.role === Role.Customer) {
      if (!user.customerId) throw new NotFoundException('Customer ID is required');
      // Customer tidak punya "produk sendiri", return empty atau redirect ke catalog
      return [];
    }

    return [];
  }

  /**
   * Helper: Dapatkan supplier untuk katalog
   */
  private async getCatalogSuppliers(user: { role: Role; customerId?: number; supplierId?: number }): Promise<number[]> {
    if (user.role === Role.Customer) {
      if (!user.customerId) throw new NotFoundException('Customer ID is required');

      const access = await this.customerSupplierAccessRepo.find({
        where: { customer: { id: user.customerId } },
        relations: ['supplier'],
      });

      return access.map((a) => a.supplier.id);
    }

    if (user.role === Role.Supplier) {
      if (!user.supplierId) throw new NotFoundException('Supplier ID is required');

      const access = await this.supplierSupplierAccessRepo.find({
        where: { viewer: { id: user.supplierId } },
        relations: ['target'],
      });

      return access.map((a) => a.target.id);
    }

    return [];
  }

  /**
   * Helper: Dapatkan semua supplier (untuk admin)
   */
  private async getAllSuppliers(): Promise<number[]> {
    const suppliers = await this.supplierRepo.find({ select: ['id'] });
    return suppliers.map(s => s.id);
  }

  /**
   * Helper: Dapatkan supplier tertentu (dengan validasi akses)
   */
  private async getSpecificSupplier(
    user: { role: Role; customerId?: number; supplierId?: number },
    specificSupplierId: number,
  ): Promise<number[]> {
    // Validasi apakah user punya akses ke supplier tersebut
    const catalogSuppliers = await this.getCatalogSuppliers(user);
    const mySuppliers = await this.getMyProductSuppliers(user);

    const allowedSuppliers = [...catalogSuppliers, ...mySuppliers];

    if (!allowedSuppliers.includes(specificSupplierId)) {
      throw new NotFoundException('Access denied to this supplier');
    }

    return [specificSupplierId];
  }

  // ... method create, findOne, update, remove tetap sama ...
  async create(dto: CreateProductDto): Promise<Product> {
    const supplier = await this.supplierRepo.findOne({
      where: { id: dto.supplier_id },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const product = this.productRepo.create({
      product_code: dto.product_code,
      name: dto.name,
      description: dto.description,
      inventory_type: dto.inventory_type,
      weight: dto.weight,
      length: dto.length,
      height: dto.height,
      width: dto.width,
      dimension: dto.dimension,
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

    // ✅ Tambahkan penyimpanan pajak produk
    if (dto.tax_ids?.length) {
      for (const taxId of dto.tax_ids) {
        const tax = await this.taxRepo.findOne({ where: { id: taxId } });
        if (!tax) throw new NotFoundException(`Tax ID ${taxId} not found`);

        await this.productTaxRepo.save({
          product: savedProduct,
          tax,
        });
      }
    }

    return this.findOne(savedProduct.id);
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