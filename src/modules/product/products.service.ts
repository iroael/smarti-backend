import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Product } from 'src/entities/product/product.entity';
import { ProductPrice } from 'src/entities/product/product-price.entity';
import { ProductBundleItem } from 'src/entities/product/product-bundle-item.entity';
import { ProductTax } from 'src/entities/product/product-tax.entity';
import { Tax } from 'src/entities/tax.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Supplier } from 'src/entities/supplier.entity';
import { CustomerSupplierAccess } from 'src/entities/customer-supplier-access.entity';
import { SupplierSupplierAccess } from 'src/entities/supplier-supplier-access.entity';
import { Role } from 'src/common/enums/role.enum';
import { CreateItemDto } from 'src/integrate-accurate/accurate/dto/create-item.dto';
import { AccurateService } from 'src/integrate-accurate/accurate/accurate.service';

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
    private readonly accurateService: AccurateService,
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
      uom: dto.uom,
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

    let bundleItems: any[] = [];
    
    // Jika produk BUNDLE -> hitung harga otomatis
    if (dto.is_bundle && dto.bundleItems?.length) {
      let totalDppBeli = 0;
      let totalDppJual = 0;
      let totalHJualB = 0;

      for (const item of dto.bundleItems) {
        const bundleProduct = await this.productRepo.findOne({
          where: { id: item.product_id },
          relations: ['prices'],
        });

        if (!bundleProduct)
          throw new NotFoundException(`Product ID ${item.product_id} not found`);

        const latestPrice = bundleProduct.prices?.[bundleProduct.prices.length - 1];
        if (!latestPrice)
          throw new NotFoundException(
            `Price not found for product ID ${item.product_id}`,
          );

        totalDppBeli += +latestPrice.dpp_beli * item.quantity;
        totalDppJual += +latestPrice.dpp_jual * item.quantity;
        totalHJualB += +latestPrice.h_jual_b * item.quantity;

        const bundleItem = this.bundleRepo.create({
          bundle: savedProduct,
          product: bundleProduct,
          quantity: item.quantity,
        });
        await this.bundleRepo.save(bundleItem);

        // Prepare bundle items for Accurate API
        bundleItems.push({
          _status: 'new',
          detailName: bundleProduct.name,
          itemNo: bundleProduct.product_code,
          itemUnitName: 'pcs', // You might want to make this configurable
          quantity: item.quantity,
        });
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

    // 🆕 Sync with Accurate API
    try {
      await this.syncToAccurate(savedProduct, bundleItems);
    } catch (error) {
      throw new Error('Failed to sync product to Accurate');
    }

    return this.findOne(savedProduct.id);
  }

  private async syncToAccurate(product: Product, bundleItems: any[] = []): Promise<void> {
    // Get the latest price for the product
    const latestPrice = await this.priceRepo.findOne({
      where: { product: { id: product.id } },
      order: { created_at: 'DESC' },
    });
    console.log('Latest price for product:', latestPrice);
    console.log('DPP Beli value:', latestPrice?.dpp_beli);
    console.log('DPP Beli type:', typeof latestPrice?.dpp_beli);
    if (!latestPrice) {
      throw new Error(`No price found for product ${product.id}`);
    }

    // Map your product data to Accurate's CreateItemDto format
    const accurateItemDto: CreateItemDto = {
      // Required fields
      itemType: product.is_bundle ? 'GROUP' : 'INVENTORY',
      name: product.name,
      no: product.product_code,
      calculateGroupPrice: product.is_bundle ? true : false,
      controlQuantity: true,
      defaultDiscount: '0',
      dimDepth: product.length || 0,
      dimHeight: product.height || 0,
      dimWidth: product.width || 0,
      vendorPrice: latestPrice.dpp_beli || 0,
      vendorUnitName: 'PCS',
      weight: product.weight || 0,
      unit1Name: 'PCS',
      unitPrice: latestPrice.h_jual_b || 0,
      usePpn: true,
      notes: product.description || '',

      // Required GL Account Numbers
      // goodTransitGlAccountNo: 'GT-001',
      // inventoryGlAccountNo: 'INV-001',
      // purchaseRetGlAccountNo: 'PUR-RET-001',
      // salesDiscountGlAccountNo: 'DISC-001',
      // salesGlAccountNo: 'SAL-001',
      // salesRetGlAccountNo: 'SAL-RET-001',
      // unBilledGlAccountNo: 'UNBILL-001',

      // Required other fields
      // itemCategoryName: 'Default',
      // manageExpired: false,
      // manageSN: false,
      // minimumQuantity: 1,
      // minimumQuantityReorder: 3,
      // percentTaxable: 100,
      // preferedVendorName: product.supplier?.name || '',
      // printDetailGroup: product.is_bundle ? true : false,
      // ratio2: 1,
      // ratio3: 1,
      // serialNumberType: 'BATCH',
      // substituted: false,
      // tax1Name: 'PPN',
      // typeAutoNumber: 1,
      // useWholesalePrice: false,

      // Detail group - required field (empty array for non-bundle items)
      detailGroup: product.is_bundle ? bundleItems : [],

      // Opening balance - required field
      detailOpenBalance: [
        {
          asOf: new Date().toLocaleDateString('id-ID'),
          itemUnitName: 'pcs',
          quantity: product.stock,
          unitCost: latestPrice.dpp_beli ? Number(latestPrice.dpp_beli) : 0, // Convert to string with 2 decimal places
          warehouseName: 'Utama',
        },
      ],
    };

    // Send to Accurate API
    const response = await this.accurateService.saveItem(accurateItemDto);

    console.log('Product synced to Accurate:', {
      productId: product.id,
      productCode: product.product_code,
      accurateResponse: response,
    });

    // You might want to save the Accurate response or ID back to your product entity
    // product.accurate_id = response.id; // if Accurate returns an ID
    // await this.productRepo.save(product);
  }
  /**
   * Sync product manually to Accurate
   * @param productId - Product ID to sync
   * @returns Promise<{ success: boolean; message: string; data?: any }>
   */
  async syncManual(productId: number): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      // Find product with relations
      const product = await this.productRepo.findOne({
        where: { id: productId },
        relations: ['supplier', 'prices', 'bundleItems', 'bundleItems.product'],
      });
      
      console.log('📦 Syncing product:', product);
      
      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      // Get the latest price for the product
      const latestPrice = await this.priceRepo.findOne({
        where: { product: { id: product.id } },
        order: { created_at: 'DESC' },
      });

      // if (!latestPrice) {
      //   throw new Error(`No price found for product ${product.id}`);
      // }

      // Prepare bundle items if product is bundle
      let bundleItems: any[] = [];
      if (product.is_bundle && product.bundleItems?.length) {
        bundleItems = product.bundleItems.map(bundleItem => ({
          _status: 'new',
          detailName: bundleItem.product.name,
          itemNo: bundleItem.product.product_code,
          itemUnitName: 'pcs',
          quantity: bundleItem.quantity,
        }));
      }

      // Sync to Accurate
      await this.syncToAccurate(product, bundleItems);

      return {
        success: true,
        message: `Product ${product.name} (${product.product_code}) successfully synced to Accurate`,
        data: {
          product,
          productId: product.id,
          productCode: product.product_code,
          productName: product.name,
          isBundle: product.is_bundle,
          bundleItemsCount: bundleItems.length,
          bundleItems, // tambahkan ini jika ingin melihat detail bundle items
          latestPrice, // tambahkan ini jika ingin melihat harga terbaru
        },
      };
    } catch (error) {
      console.error('Manual sync error:', error);
      return {
        success: false,
        message: `Failed to sync product: ${error.message}`,
        data: {
          productId,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Sync multiple products manually to Accurate
   * @param productIds - Array of Product IDs to sync
   * @returns Promise<{ success: boolean; results: any[]; summary?: any }>
   */
  async syncManualBatch(productIds: number[]): Promise<{ success: boolean; results: any[]; summary?: any }> {
    const results: any[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const productId of productIds) {
      const result = await this.syncManual(productId);
      results.push(result);
      if (result.success) {
        successCount++;
      } else {
        failedCount++;
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
      success: failedCount === 0,
      results,
      summary: {
        total: productIds.length,
        success: successCount,
        failed: failedCount,
        timestamp: new Date().toISOString(),
      }
    };
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

    if (product.product_code) {
      try {
        await this.accurateService.deleteItem(product.product_code);
      } catch (err) {
        throw new Error(`Failed to delete product from Accurate: ${err.message}`);
        // Jika ingin log error ke console
        // console.error('Failed to delete from Accurate:', err.message);
        // Opsional: throw error jika ingin rollback atau beri peringatan
      }
    }

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