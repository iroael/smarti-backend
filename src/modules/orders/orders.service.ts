import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, EntityManager, DataSource } from 'typeorm';
import { Order } from '../../entities/orders/order.entity';
import { OrderItem } from '../../entities/orders/order-item.entity';
import { Product } from '../../entities/product/product.entity';
import { Customer } from '../../entities/customer.entity';
import { Supplier } from '../../entities/supplier.entity';
import { OrderItemTax } from '../../entities/orders/order-item-tax.entity';
import { Tax } from '../../entities/tax.entity';
import { Addresses } from '../../entities/address.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { SupplierSupplierAccess } from 'src/entities/supplier-supplier-access.entity';
import { MidtransService } from '../midtrans/midtrans.service';
import { OrderStatus } from 'src/common/enums/order-status.enum';
import { ProductBundleItem } from 'src/entities/product/product-bundle-item.entity';
import { XenditService } from '../xendit/xendit.service'; // pastikan path sesuai

// Konstanta untuk menghindari magic numbers dan hard-coded values
const DEFAULT_TAX_NAME = 'PPN 11%';
const ORDER_NUMBER_SUFFIX_LENGTH = 5;
const DEFAULT_PAGE_SIZE = 50;
const MAX_ORDER_DEPTH = 5; // Maksimal 3 level order

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  // Cache untuk data yang sering diakses
  private defaultTaxCache: Tax | null = null;

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,

    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,

    @InjectRepository(OrderItemTax)
    private readonly orderItemTaxRepo: Repository<OrderItemTax>,

    @InjectRepository(Tax)
    private readonly taxRepo: Repository<Tax>,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(ProductBundleItem)
    private readonly productBundleRepo: Repository<ProductBundleItem>,

    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,

    @InjectRepository(SupplierSupplierAccess)
    private readonly supplierAccessRepo: Repository<SupplierSupplierAccess>,

    @InjectRepository(Addresses)
    private readonly addressRepo: Repository<Addresses>,

    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,

    private readonly midtransService: MidtransService,

    private readonly xenditService: XenditService,

    private readonly dataSource: DataSource,
  ) {}

  /**
   * Generate nomor order dengan format ORD-YYYYMMDD-XXXXX
   * Menggunakan query yang optimal untuk mencari nomor terakhir
   * @returns Promise<string> - Nomor order yang unik
   */
  async generateOrderNumber(supplierCode: string): Promise<string> {
    const datePart = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const prefix = `SO-${datePart}`;
    // const prefix = `${supplierCode.toUpperCase()}-${datePart}`;
    const timestamp = Math.floor(Date.now() / 1000); // dalam detik (bisa pakai milidetik juga)

    return await this.dataSource.transaction(async (manager) => {
      const latestOrder = await manager
        .createQueryBuilder(Order, 'order')
        .setLock('pessimistic_write') // lock row to avoid race condition
        .select('order.orderNumber')
        .where('order.orderNumber LIKE :prefix', { prefix: `${prefix}-%` })
        .orderBy('order.orderNumber', 'DESC')
        .limit(1)
        .getOne();

      let nextNumber = 1;
      if (latestOrder) {
        const parts = latestOrder.orderNumber.split('-');
        const lastNum = parseInt(parts[2], 10);
        nextNumber = lastNum + 1;
      }

      // const padded = String(nextNumber).padStart(ORDER_NUMBER_SUFFIX_LENGTH, '0');
      return `${prefix}-${timestamp}`;
    });
  }

  /**
   * Mengambil data tax default dengan caching untuk performa
   * @returns Promise<Tax> - Data tax default
   */
  private async getDefaultTax(): Promise<Tax> {
    if (!this.defaultTaxCache) {
      this.defaultTaxCache = await this.taxRepo.findOne({ 
        where: { name: DEFAULT_TAX_NAME } 
      });
      
      if (!this.defaultTaxCache) {
        throw new BadRequestException(`Default tax '${DEFAULT_TAX_NAME}' not found`);
      }
    }
    return this.defaultTaxCache;
  }
/**
   * Validasi input order dan mengembalikan data yang diperlukan
   * Menggunakan batch query untuk menghindari N+1 problem
   * @param dto - Data order yang akan dibuat
   * @returns Promise dengan customer, products, dan supplier
   */
  private async validateOrderInput(dto: CreateOrderDto): Promise<{
    customer: Customer;
    products: Product[];
    supplier: Supplier;
  }> {
    // Validasi basic input
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must have at least one item');
    }

    if (dto.items.some(item => item.quantity <= 0)) {
      throw new BadRequestException('All item quantities must be greater than 0');
    }

    // Validasi customer
    const customer = await this.customerRepo.findOne({ 
      where: { id: dto.customerId } 
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${dto.customerId} not found`);
    }

    // Batch query untuk products - menghindari N+1 problem
    const productIds = dto.items.map(item => item.productId);
    const products = await this.productRepo.find({
      where: { id: In(productIds) },
      relations: ['prices', 'supplier'],
    });

    // Validasi semua product ditemukan
    if (products.length !== productIds.length) {
      const foundIds = products.map(p => p.id);
      const missingIds = productIds.filter(id => !foundIds.includes(id));
      throw new BadRequestException(`Products not found: ${missingIds.join(', ')}`);
    }

    // Validasi semua product dari supplier yang sama
    const suppliers = [...new Set(products.map(p => p.supplier.id))];
    if (suppliers.length > 1) {
      throw new BadRequestException('All products must be from the same supplier');
    }

    const supplier = products[0].supplier;

    // Validasi semua product memiliki harga
    const productsWithoutPrice = products.filter(p => 
      !p.prices || p.prices.length === 0
    );
    if (productsWithoutPrice.length > 0) {
      const productNames = productsWithoutPrice.map(p => p.product_code).join(', ');
      throw new BadRequestException(`Products without price: ${productNames}`);
    }

    return { customer, products, supplier };
  }

  /**
   * Membuat order items dengan kalkulasi harga dan pajak
   * @param dto - Data order
   * @param products - Data products yang sudah tervalidasi
   * @param defaultTax - Data tax default
   * @returns Promise dengan order items dan total
   */
  private async createOrderItems(
    dto: CreateOrderDto, 
    products: Product[], 
    defaultTax: Tax
  ): Promise<{ orderItems: OrderItem[]; total: number }> {
    // Buat map untuk akses cepat product by ID
    const productMap = new Map(products.map(p => [p.id, p]));
    let total = 0;
    const orderItems: OrderItem[] = [];

    for (const itemDto of dto.items) {
      const product = productMap.get(itemDto.productId)!;
      const latestPrice = product.prices[product.prices.length - 1];
      
      const quantity = itemDto.quantity;
      const price = Number(latestPrice.h_jual_b);
      const subtotal = price * quantity;
      const taxRate = Number(defaultTax.rate);
      const taxAmount = (subtotal * taxRate) / 100;

      total += subtotal + taxAmount;

      const orderItem = this.orderItemRepo.create({
        product,
        quantity,
        price,
        taxes: [
          this.orderItemTaxRepo.create({
            tax: defaultTax,
            taxRate,
            taxAmount,
          }),
        ],
      });

      orderItems.push(orderItem);
    }

    return { orderItems, total };
  }

  /**
   * Membuat sub-order dengan sistem 3 level secara otomatis
   * Level 1: Customer -> Supplier 1
   * Level 2: Supplier 1 -> Supplier 2 (bundling)
   * Level 3: Supplier 2 -> Multiple Suppliers (unbundling)
   *
   * @param manager - Entity manager untuk transaction
   * @param parentOrder - Order induk
   * @param currentSupplier - Supplier saat ini
   * @param originalDto - Data order asli
   * @param defaultTax - Data tax default
   * @param currentLevel - Level saat ini (1, 2, atau 3)
   */
  private async createSubOrderIfNeeded(
    manager: EntityManager,
    parentOrder: Order,
    currentSupplier: Supplier,
    originalDto: CreateOrderDto,
    defaultTax: Tax,
    currentLevel: number = 1
  ): Promise<void> {
    // Batas maksimal level untuk mencegah infinite loop
    if (currentLevel >= MAX_ORDER_DEPTH) {
      this.logger.warn(`🚫 Maximum order depth (${MAX_ORDER_DEPTH}) reached. Stopping recursion.`);
      return;
    }

    this.logger.log(`🔄 [Level ${currentLevel}] Processing sub-orders for supplier ${currentSupplier.name} (ID: ${currentSupplier.id})`);

    // Cari semua supplier yang memiliki akses ke currentSupplier
    const accessRecords = await this.supplierAccessRepo.find({
      where: { viewer: { id: currentSupplier.id } },
      relations: ['target'],
    });

    if (accessRecords.length === 0) {
      this.logger.log(`🟡 [Level ${currentLevel}] No parent suppliers found for supplier ${currentSupplier.name}`);
      return;
    }

    this.logger.log(`📋 [Level ${currentLevel}] Found ${accessRecords.length} parent suppliers for ${currentSupplier.name}`);

    // Process setiap supplier yang memiliki akses
    for (const access of accessRecords) {
      const targetSupplier = access.target;
      
      this.logger.log(`🎯 [Level ${currentLevel}] Creating sub-order for supplier ${targetSupplier.name} (ID: ${targetSupplier.id})`);

      try {
        // Ambil alamat default supplier untuk delivery
        const addressSupplier = await this.addressRepo.findOne({
          where: {
            ownerType: 'supplier',
            ownerId: currentSupplier.id,
            is_default: true,
          },
        });

        if (!addressSupplier) {
          this.logger.error(`❌ [Level ${currentLevel}] Default address for supplier ${currentSupplier.name} not found`);
          throw new BadRequestException(`Default address for supplier ${currentSupplier.name} not found`);
        }

        // Buat order items untuk sub-order
        const subOrderItems = await this.createSubOrderItems(
          parentOrder.items,
          targetSupplier,
          defaultTax,
          currentLevel,
        );
        

        if (subOrderItems.length === 0) {
          this.logger.warn(`⚠️ [Level ${currentLevel}] No items found for supplier ${targetSupplier.name}. Skipping.`);
          continue;
        }

        // Hitung total sub-order
        const subOrderSubTotal = subOrderItems.reduce(
          (sum, item) => sum + item.quantity * Number(item.price),
          0,
        );

        const subOrderTaxTotal = subOrderItems.reduce(
          (sum, item) =>
            sum +
            item.taxes.reduce((taxSum, tax) => taxSum + Number(tax.taxAmount), 0),
          0,
        );

        const subOrderTotal = subOrderSubTotal + subOrderTaxTotal;

        // Generate nomor order untuk sub-order
        const subOrderNumber = await this.generateOrderNumber(targetSupplier.supplier_code);

        // Buat sub-order
        const subOrder = this.orderRepo.create({
          customer: currentSupplier as any, // currentSupplier bertindak sebagai customer
          supplier: targetSupplier,
          orderNumber: subOrderNumber,
          orderDate: new Date(),
          status: OrderStatus.PENDING,
          notes: `Auto-generated sub-order (Level ${currentLevel + 1}) from ${parentOrder.orderNumber}`,
          deliveryAddress: addressSupplier.id,
          total: subOrderTotal,
          subTotal: subOrderSubTotal,
          parentOrder: parentOrder,
          items: subOrderItems,
        });

        // Simpan sub-order
        const savedSubOrder = await manager.save(Order, subOrder);

        this.logger.log(`✅ [Level ${currentLevel}] Sub-order created: ${savedSubOrder.orderNumber} (Total: ${subOrderTotal})`);
        this.logger.log(`   └── Customer: ${currentSupplier.name} -> Supplier: ${targetSupplier.name}`);
        this.logger.log(`   └── Items: ${subOrderItems.length} items`);

        // Recursively create sub-sub-orders (Level 3)
        await this.createSubOrderIfNeeded(
          manager,
          savedSubOrder,
          targetSupplier,
          originalDto,
          defaultTax,
          currentLevel + 1,
        );
      } catch (error) {
        this.logger.error(`❌ [Level ${currentLevel}] Error creating sub-order for supplier ${targetSupplier.name}:`, error);
        // Continue dengan supplier lain jika ada error
        continue;
      }
    }
  }

  /**
   * Membuat items untuk sub-order dengan logika bundling/unbundling
   * Level 2: Bundling (beberapa product menjadi satu bundle)
   * Level 3: Unbundling (bundle dipecah menjadi individual products)
   *
   * @param mainOrderItems - Items dari order utama
   * @param targetSupplier - Supplier tujuan
   * @param defaultTax - Data tax default
   * @param currentLevel - Level saat ini
   * @returns Promise array of sub-order items
   */
  private async createSubOrderItems(
    mainOrderItems: OrderItem[],
    targetSupplier: Supplier,
    defaultTax: Tax,
    currentLevel: number,
  ): Promise<OrderItem[]> {
    const subOrderItems: OrderItem[] = [];

    this.logger.log(`🔧 [Level ${currentLevel}] Creating sub-order items for supplier ${targetSupplier.name} (ID: ${targetSupplier.id})`);

    // Level 2: Bundling Logic
    if (currentLevel === 1) {
      return await this.createBundledItems(mainOrderItems, targetSupplier, defaultTax);
    }

    // Level 3: Unbundling Logic
    if (currentLevel === 2) {
      return await this.createUnbundledItems(mainOrderItems, targetSupplier, defaultTax);
    }

    // Default: Direct mapping (Level 1 atau fallback)
    return await this.createDirectMappedItems(mainOrderItems, targetSupplier, defaultTax);
  }

  /**
   * Membuat bundled items untuk Level 2
   * Menggabungkan beberapa produk menjadi bundle
   */
  private async createBundledItems(
    mainOrderItems: OrderItem[],
    targetSupplier: Supplier,
    defaultTax: Tax
  ): Promise<OrderItem[]> {
    const bundledItems: OrderItem[] = [];
    
    this.logger.log(`📦 [Bundling] Creating bundled items for supplier ${targetSupplier.name}`);

    // Group items by product category atau kriteria lain untuk bundling
    const itemGroups = this.groupItemsForBundling(mainOrderItems);

    for (const group of itemGroups) {
      // Cari bundle product yang sesuai di target supplier
      const bundleProduct = await this.findBundleProduct(group, targetSupplier);
      
      if (bundleProduct) {
        const bundleItem = await this.createBundleOrderItem(
          bundleProduct,
          group,
          defaultTax
        );
        bundledItems.push(bundleItem);
        
        this.logger.log(`✅ [Bundling] Created bundle: ${bundleProduct.product_code} (${group.length} items bundled)`);
      } else {
        // Fallback: buat individual items jika tidak ada bundle
        const individualItems = await this.createDirectMappedItems(
          group,
          targetSupplier,
          defaultTax
        );
        bundledItems.push(...individualItems);
        
        this.logger.warn(`⚠️ [Bundling] No bundle found, created ${individualItems.length} individual items`);
      }
    }

    return bundledItems;
  }

  /**
   * Membuat unbundled items untuk Level 3
   * Memecah bundle menjadi produk individual
   */
  private async createUnbundledItems(
    mainOrderItems: OrderItem[],
    targetSupplier: Supplier,
    defaultTax: Tax
  ): Promise<OrderItem[]> {
    const unbundledItems: OrderItem[] = [];
    
    this.logger.log(`🔓 [Unbundling] Creating unbundled items for supplier ${targetSupplier.name}`);

    for (const item of mainOrderItems) {
      // Cek apakah item ini adalah bundle
      const bundleItems = await this.productBundleRepo.find({
        where: { bundle: { id: item.product.id } },
        relations: ['product', 'product.prices', 'product.supplier'],
      });

      if (bundleItems.length > 0) {
        this.logger.log(`📦 [Unbundling] Found bundle with ${bundleItems.length} items: ${item.product.product_code}`);
        
        // Unbundle: buat order item untuk setiap component
        for (const bundleItem of bundleItems) {
          const componentProduct = bundleItem.product;
          
          // Cek apakah component product tersedia di target supplier
          const supplierProduct = await this.findProductInSupplier(
            componentProduct.product_code,
            targetSupplier
          );

          if (supplierProduct) {
            const unbundledItem = await this.createOrderItemFromProduct(
              supplierProduct,
              item.quantity * (bundleItem.quantity || 1), // Kalikan dengan quantity bundle
              defaultTax
            );
            unbundledItems.push(unbundledItem);
            
            this.logger.log(`✅ [Unbundling] Created item: ${supplierProduct.product_code} x${unbundledItem.quantity}`);
          } else {
            this.logger.warn(`⚠️ [Unbundling] Component ${componentProduct.product_code} not found in supplier ${targetSupplier.name}`);
          }
        }
      } else {
        // Bukan bundle, buat direct mapping
        const directItem = await this.createDirectMappedItems([item], targetSupplier, defaultTax);
        unbundledItems.push(...directItem);
      }
    }

    return unbundledItems;
  }

  /**
   * Membuat direct mapped items (default behavior)
   */
  private async createDirectMappedItems(
    mainOrderItems: OrderItem[],
    targetSupplier: Supplier,
    defaultTax: Tax,
  ): Promise<OrderItem[]> {
    const directItems: OrderItem[] = [];
    this.logger.log(`🔄 [Direct Mapping] Creating direct mapped items for supplier ${targetSupplier.name}`);

    for (const item of mainOrderItems) {
      const productCode = item.product.product_code;
      // Cari produk yang sama di target supplier
      const supplierProduct = await this.findProductInSupplier(productCode, targetSupplier);
      if (supplierProduct) {
        const directItem = await this.createOrderItemFromProduct(
          supplierProduct,
          item.quantity,
          defaultTax,
        );
        directItems.push(directItem);
        this.logger.log(`✅ [Direct Mapping] Created item: ${productCode} x${item.quantity}`);
      } else {
        this.logger.warn(`⚠️ [Direct Mapping] Product ${productCode} not found in supplier ${targetSupplier.name}`);
      }
    }

    return directItems;
  }

  /**
   * Group items untuk bundling berdasarkan kriteria tertentu
   */
  private groupItemsForBundling(items: OrderItem[]): OrderItem[][] {
    // Implementasi grouping logic sesuai business rule
    // Contoh: group by kategori, brand, atau kriteria lain
    // Sementara return semua items sebagai satu group
    return [items];
  }

  /**
   * Mencari bundle product di supplier
   */
  private async findBundleProduct(
    items: OrderItem[],
    supplier: Supplier
  ): Promise<Product | null> {
    // Implementasi pencarian bundle product
    // Bisa berdasarkan kombinasi product codes atau kriteria lain
    
    // Contoh implementasi sederhana
    const productCodes = items.map(item => item.product.product_code);
    const bundleCode = `BUNDLE_${productCodes.join('_')}`;
    
    return await this.productRepo.findOne({
      where: {
        product_code: bundleCode,
        supplier: { id: supplier.id }
      },
      relations: ['prices']
    });
  }

  /**
   * Membuat bundle order item
   */
  private async createBundleOrderItem(
    bundleProduct: Product,
    originalItems: OrderItem[],
    defaultTax: Tax
  ): Promise<OrderItem> {
    const latestPrice = bundleProduct.prices[bundleProduct.prices.length - 1];
    const totalQuantity = originalItems.reduce((sum, item) => sum + item.quantity, 0);
    
    return this.createOrderItemFromProduct(bundleProduct, totalQuantity, defaultTax);
  }

  /**
   * Mencari produk di supplier tertentu
   */
  private async findProductInSupplier(
    productCode: string,
    supplier: Supplier
  ): Promise<Product | null> {
    return await this.productRepo.findOne({
      where: {
        product_code: productCode,
        supplier: { id: supplier.id }
      },
      relations: ['prices']
    });
  }

  /**
   * Membuat order item dari product
   */
  private async createOrderItemFromProduct(
    product: Product,
    quantity: number,
    defaultTax: Tax,
  ): Promise<OrderItem> {
    const latestPrice = product.prices[product.prices.length - 1];
    
    if (!latestPrice) {
      throw new BadRequestException(`No price found for product ${product.product_code}`);
    }

    const price = Number(latestPrice.h_jual_b);
    const subtotal = price * quantity;
    const taxRate = Number(defaultTax.rate);
    const taxAmount = (subtotal * taxRate) / 100;

    return this.orderItemRepo.create({
      product,
      quantity,
      price,
      taxes: [
        this.orderItemTaxRepo.create({
          tax: defaultTax,
          taxRate,
          taxAmount,
        }),
      ],
    });
  }

  /**
   * Membuat order baru dengan validasi lengkap dan transaction
   * Menangani scenario 3 level order creation secara otomatis
   * @param dto - Data order yang akan dibuat
   * @returns Promise dengan order yang telah dibuat
   */
  async create(dto: CreateOrderDto): Promise<{ order: Order; snapToken: string }> {
    this.logger.log(`🚀 [LEVEL 1] Creating order for customer ID: ${dto.customerId}`);

    return await this.orderRepo.manager.transaction(async (manager) => {
      try {
        // Step 1: Validasi input
        const { customer, products, supplier } = await this.validateOrderInput(dto);

        // Step 2: Ambil default tax
        const defaultTax = await this.getDefaultTax();

        // Step 3: Generate nomor order utama
        const orderNumber = await this.generateOrderNumber(supplier.supplier_code);
        this.logger.log(`📦 Generated Order Number: ${orderNumber}`);

        // Step 4: Buat item order utama
        const { orderItems, total } = await this.createOrderItems(dto, products, defaultTax);

        // Step 5: Buat object mainOrder (Level 1)
        const mainOrder = this.orderRepo.create({
          customer,
          supplier,
          orderNumber,
          orderDate: new Date(),
          status: OrderStatus.PENDING,
          subTotal: total,
          total: total + (dto.shippingCost || 0),
          notes: dto.notes,
          deliveryAddress: dto.deliveryAddress,
          shippingCost: dto.shippingCost || 0,
          items: orderItems,
        });

        // Step 6: Simpan main order
        const savedOrder = await manager.save(Order, mainOrder);
        this.logger.log(`💾 [LEVEL 1] Main order saved: ${savedOrder.orderNumber}`);

        // Step 7: Mulai proses create suborder (jika ada)
        // this.logger.log(`🔄 Starting 3-level order creation process...`);
        // await this.createSubOrderIfNeeded(manager, savedOrder, supplier, dto, defaultTax, 1);

        // ========== INTEGRASI PEMBAYARAN ==========
        // Step 8 (A): Gunakan Midtrans (di-comment)
        /*
        const snapToken = await this.midtransService.generateSnapToken({
          orderId: savedOrder.orderNumber,
          amount: savedOrder.total,
          customer: {
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
          },
        });

        const expiredAt = new Date();
        expiredAt.setHours(expiredAt.getHours() + 2);
        savedOrder.snapToken = snapToken;
        savedOrder.snapTokenExpiredAt = expiredAt;
        */

        // Step 8 (B): Gunakan Xendit Invoice
        const xenditInvoice = await this.xenditService.createInvoice({
          externalId: savedOrder.orderNumber,
          amount: savedOrder.total,
          payerEmail: customer.email,
          description: `Pembayaran Order #${savedOrder.orderNumber}`,
        });

        savedOrder.snapToken = xenditInvoice.invoice_url;
        savedOrder.snapTokenExpiredAt = new Date(xenditInvoice.expiry_date);

        // Step 9: Simpan order yg sudah punya invoice
        await manager.save(Order, savedOrder);

        // Step 10: Logging akhir
        this.logger.log(`📨 Xendit invoice created: ${xenditInvoice.invoice_url}`);
        this.logger.log(`🎉 Order complete: ${savedOrder.orderNumber}`);

        return {
          order: savedOrder,
          snapToken: xenditInvoice.invoice_url,
        };
      } catch (error) {
        this.logger.error('❌ Error creating order', error);
        throw error;
      }
    });
  }


  /**
   * Mengambil order tree (parent dan semua sub-orders)
   */
  async findOrderTree(orderId: string): Promise<Order> {
    const order = await this.findOne(orderId);
    
    // Jika ini adalah sub-order, ambil parent order
    if (order.parentOrder) {
      return await this.findOrderTree(order.parentOrder.id);
    }
    
    // Jika ini adalah main order, ambil semua sub-orders secara recursive
    return await this.populateSubOrders(order);
  }

  /**
   * Populate sub-orders secara recursive
   */
  private async populateSubOrders(order: Order): Promise<Order> {
    const subOrders = await this.orderRepo.find({
      where: { parentOrder: { id: order.id } },
      relations: ['customer', 'supplier', 'items', 'items.product']
    });

    for (const subOrder of subOrders) {
      await this.populateSubOrders(subOrder);
    }

    order.subOrders = subOrders;
    return order;
  }
  /**
   * Mengambil semua order dengan pagination dan optimasi query
   * @param page - Halaman yang diminta (default: 0)
   * @param limit - Jumlah data per halaman (default: 50)
   * @returns Promise dengan data orders dan metadata pagination
   */
  async findAll(page: number = 0, limit: number = DEFAULT_PAGE_SIZE): Promise<{
    data: Order[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      // Optimasi query dengan select field yang diperlukan dan pagination
      const [orders, total] = await this.orderRepo.findAndCount({
        select: ['id', 'orderNumber', 'orderDate', 'status', 'total', 'notes', 'snapToken', 'snapTokenExpiredAt', 'shippingCost', 'deliveryAddress'],
        relations: ['customer', 'supplier'],
        order: { orderDate: 'DESC' },
        take: limit,
        skip: page * limit,
      });

      return {
        data: orders,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error('Error finding all orders', error);
      throw new BadRequestException('Failed to retrieve orders');
    }
  }

  /**
   * Mengambil semua order berdasarkan customer dengan pagination
   * @param customerId - ID customer
   * @param page - Halaman yang diminta
   * @param limit - Jumlah data per halaman
   * @returns Promise dengan data orders customer
   */
  async findAllByCustomer(
    customerId: number,
    page: number = 0,
    limit: number = DEFAULT_PAGE_SIZE,
  ): Promise<{ data: Order[]; total: number; page: number; limit: number }> {
    if (!customerId) {
      throw new BadRequestException('Customer ID is required');
    }

    try {
      const [orders, total] = await this.orderRepo.findAndCount({
        where: { customer: { id: customerId } },
        select: ['id', 'orderNumber', 'orderDate', 'status', 'total'],
        relations: ['supplier', 'items', 'items.product'],
        order: { orderDate: 'DESC' },
        take: limit,
        skip: page * limit,
      });

      return { data: orders, total, page, limit };
    } catch (error) {
      this.logger.error(`Error finding orders for customer ${customerId}`, error);
      throw new BadRequestException('Failed to retrieve customer orders');
    }
  }

  /**
   * Mengambil semua order berdasarkan supplier dengan pagination
   * @param supplierId - ID supplier
   * @param page - Halaman yang diminta
   * @param limit - Jumlah data per halaman
   * @returns Promise dengan data orders supplier
   */
  async findAllBySupplier(
    supplierId: number, 
    page: number = 0, 
    limit: number = DEFAULT_PAGE_SIZE
  ): Promise<{ data: Order[]; total: number; page: number; limit: number }> {
    if (!supplierId) {
      throw new BadRequestException('Supplier ID is required');
    }

    try {
      const [orders, total] = await this.orderRepo.findAndCount({
        where: { supplier: { id: supplierId } },
        select: ['id', 'orderNumber', 'orderDate', 'status', 'total'],
        relations: ['customer', 'items', 'items.product'],
        order: { orderDate: 'DESC' },
        take: limit,
        skip: page * limit,
      });

      return { data: orders, total, page, limit };
    } catch (error) {
      this.logger.error(`Error finding orders for supplier ${supplierId}`, error);
      throw new BadRequestException('Failed to retrieve supplier orders');
    }
  }

  /**
   * Mengambil order milik supplier (ketika supplier bertindak sebagai customer)
   * Untuk kasus dimana supplier memesan ke parent supplier
   * @param supplierId - ID supplier yang bertindak sebagai customer
   * @returns Promise dengan data orders
   */
  async findMyOrders(supplierId: number): Promise<{ data: Order[] }> {
    console.log('=== DETAILED DEBUG ===');
    console.log('supplierId:', supplierId, typeof supplierId);
    
    if (!supplierId) {
      throw new BadRequestException('Supplier ID is required');
    }

    try {
      // 2. Get access records
      const accessRecords = await this.supplierAccessRepo.find({
        where: { viewer: { id: supplierId } },
        relations: ['target'],
      });

      if (accessRecords.length === 0) {
        return { data: [] };
      }

      const allowedSupplierIds = accessRecords.map((access) => access.target.id);
      // Approach 1: Direct column query (without relations)
      const orders = await this.orderRepo.find({
        where: {
          customerId: supplierId,
          supplierId: In(allowedSupplierIds),
        },
        relations: ['supplier', 'items', 'items.product'],
        order: { orderDate: 'DESC' },
      });
      return { data: orders };
    } catch (error) {
      this.logger.error(`Error finding my orders for supplier ${supplierId}`, error);
      throw new BadRequestException('Failed to retrieve supplier orders');
    }
  }

  /**
   * Mengambil order yang masuk ke supplier (incoming orders)
   * Menangani kasus dimana customer adalah supplier lain
   * @param supplierId - ID supplier penerima order
   * @returns Promise dengan data incoming orders
   */
  async findIncoming(supplierId: number): Promise<{ data: Order[] }> {
    if (!supplierId) {
      throw new BadRequestException('Supplier ID is required');
    }

    try {
      this.logger.log(`Finding incoming orders for supplier ${supplierId}`);

      const orders = await this.orderRepo.find({
        where: { supplier: { id: supplierId } },
        relations: ['customer', 'items', 'items.product'],
        order: { orderDate: 'DESC' },
      });

      // Handle kasus dimana customer adalah supplier (tidak ada relasi customer)
      for (const order of orders) {
        if (!order.customer && order.customerId) {
          await this.enrichOrderWithSupplierCustomer(order, supplierId);
        }
      }

      return { data: orders };
    } catch (error) {
      this.logger.error(`Error finding incoming orders for supplier ${supplierId}`, error);
      throw new BadRequestException('Failed to retrieve incoming orders');
    }
  }

  /**
   * Memperkaya data order dengan informasi supplier yang bertindak sebagai customer
   * @param order - Order yang akan diperkaya
   * @param supplierId - ID supplier penerima order
   */
  private async enrichOrderWithSupplierCustomer(order: Order, supplierId: number): Promise<void> {
    const access = await this.supplierAccessRepo.findOne({
      where: {
        target: { id: supplierId },
        viewer: { id: order.customerId },
      },
      relations: ['viewer'],
    });

    if (access?.viewer) {
      // Simulasi customer menggunakan data supplier
      const simulatedCustomer = {
        id: access.viewer.id,
        name: access.viewer.name,
        email: access.viewer.email,
        phone: access.viewer.phone,
        address: access.viewer.address,
        city: '',
        province: '',
        postalcode: '',
        npwp: '',
        createdAt: access.viewer.created_at,
      };

      // Resolve delivery address jika berupa ID
      if (order.deliveryAddress && typeof order.deliveryAddress === 'string') {
        try {
          const addressId = parseInt(order.deliveryAddress, 10);
          if (!isNaN(addressId)) {
            const addr = await this.addressRepo.findOne({
              where: { id: addressId },
            });
            if (addr) {
              simulatedCustomer.address = addr.address;
              simulatedCustomer.city = addr.city;
              simulatedCustomer.province = addr.province;
              simulatedCustomer.postalcode = addr.postalcode;
            }
          }
        } catch (error) {
          this.logger.warn(`Failed to resolve delivery address: ${order.deliveryAddress}`);
        }
      }

      // Assign simulated customer ke order
      order.customer = simulatedCustomer as any;
    }
  }

  /**
   * Mengambil detail order berdasarkan ID
   * @param id - ID order
   * @returns Promise dengan detail order
   */
  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: [
        // 'customer',
        'supplier',
        'items',
        'items.product',
        'items.taxes',
        'items.taxes.tax',
        'shippings',
      ],
    });

    if (!order) throw new NotFoundException('Order not found');
    // Coba cari di tabel customers
    let customer: Customer | Supplier | null = await this.customerRepo.findOne({
      where: { id: order.customerId },
    });

    if (!customer) {
      customer = await this.supplierRepo.findOne({
        where: { id: order.customerId },
      });
    }

    (order as any).customer = customer;
    return order;
  }

  /**
   * Menghapus order berdasarkan ID
   * Hanya order dengan status tertentu yang bisa dihapus
   * @param id - ID order yang akan dihapus
   */
  async delete(id: string): Promise<void> {
    if (!id) {
      throw new BadRequestException('Order ID is required');
    }

    try {
      // Cek apakah order ada
      const order = await this.orderRepo.findOne({ 
        where: { id },
        relations: ['items']
      });

      if (!order) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }

      // Cek apakah order masih bisa dihapus berdasarkan status
      const deletableStatuses = [
        OrderStatus.PENDING,
        OrderStatus.AWAITING_PAYMENT,
        OrderStatus.CANCELLED,
        OrderStatus.REJECTED
      ];

      if (!deletableStatuses.includes(order.status)) {
        throw new BadRequestException(
          `Cannot delete order with status ${order.status}. Only orders with status ${deletableStatuses.join(', ')} can be deleted.`
        );
      }

      const result = await this.orderRepo.delete(id);
      
      if (result.affected === 0) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }

      this.logger.log(`Order ${id} with status ${order.status} deleted successfully`);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error deleting order ${id}`, error);
      throw new BadRequestException('Failed to delete order');
    }
  }

  /**
   * Mencari order berdasarkan nomor order
   * @param orderNumber - Nomor order
   * @returns Promise dengan data order atau null
   */
  async findOrderById(orderNumber: string): Promise<Order | null> {
    if (!orderNumber) {
      throw new BadRequestException('Order number is required');
    }

    try {
      return await this.orderRepo.findOne({
        where: { orderNumber },
        relations: ['customer', 'supplier'],
      });
    } catch (error) {
      this.logger.error(`Error finding order by number ${orderNumber}`, error);
      throw new BadRequestException('Failed to find order');
    }
  }

  /**
   * Update status order berdasarkan nomor order
   * @param orderNumber - Nomor order
   * @param status - Status baru
   */
  async updateOrderStatus(orderNumber: string, status: string): Promise<void> {
    if (!orderNumber) {
      throw new BadRequestException('Order number is required');
    }

    if (!status) {
      throw new BadRequestException('Status is required');
    }

    // Validasi status
    if (!Object.values(OrderStatus).includes(status as OrderStatus)) {
      throw new BadRequestException(
        `Invalid order status: ${status}. Valid statuses: ${Object.values(OrderStatus).join(', ')}`
      );
    }

    try {
      const order = await this.orderRepo.findOne({ where: { orderNumber } });

      if (!order) {
        throw new NotFoundException(`Order with number ${orderNumber} not found`);
      }

      // Validasi transisi status (opsional - tergantung business rule)
      if (!this.isValidStatusTransition(order.status, status as OrderStatus)) {
        throw new BadRequestException(
          `Cannot change status from ${order.status} to ${status}`
        );
      }

      order.status = status as OrderStatus;
      await this.orderRepo.save(order);

      this.logger.log(`Order ${orderNumber} status updated to ${status}`);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error updating order status ${orderNumber}`, error);
      throw new BadRequestException('Failed to update order status');
    }
  }

  /**
   * Validasi apakah transisi status order valid berdasarkan business rule
   * @param currentStatus - Status saat ini
   * @param newStatus - Status baru
   * @returns boolean - true jika transisi valid
   */
  private isValidStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
    // Definisi aturan transisi status berdasarkan workflow bisnis
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [
        OrderStatus.AWAITING_PAYMENT,
        OrderStatus.CANCELLED,
        OrderStatus.REJECTED
      ],
      [OrderStatus.AWAITING_PAYMENT]: [
        OrderStatus.PAID,
        OrderStatus.CANCELLED,
        OrderStatus.REJECTED
      ],
      [OrderStatus.PAID]: [
        OrderStatus.SCHEDULED,
        OrderStatus.CANCELLED,
        OrderStatus.REFUNDED
      ],
      [OrderStatus.SCHEDULED]: [
        OrderStatus.IN_PROGRESS,
        OrderStatus.CANCELLED,
        OrderStatus.REFUNDED
      ],
      [OrderStatus.IN_PROGRESS]: [
        OrderStatus.COMPLETED,
        OrderStatus.CANCELLED
      ],
      [OrderStatus.COMPLETED]: [
        OrderStatus.REFUNDED
      ],
      [OrderStatus.SHIPPED]: [],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.REJECTED]: [],
      [OrderStatus.REFUNDED]: [],
    };

    return validTransitions[currentStatus]?.includes(newStatus) ?? false;
  }

  /**
   * Mendapatkan daftar status yang valid untuk transisi dari status saat ini
   * @param currentStatus - Status saat ini
   * @returns array status yang valid untuk transisi
   */
  getValidNextStatuses(currentStatus: OrderStatus): OrderStatus[] {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [
        OrderStatus.AWAITING_PAYMENT,
        OrderStatus.CANCELLED,
        OrderStatus.REJECTED,
      ],
      [OrderStatus.AWAITING_PAYMENT]: [
        OrderStatus.PAID,
        OrderStatus.CANCELLED,
        OrderStatus.REJECTED,
      ],
      [OrderStatus.PAID]: [
        OrderStatus.SCHEDULED,
        OrderStatus.CANCELLED,
        OrderStatus.REFUNDED,
      ],
      [OrderStatus.SCHEDULED]: [
        OrderStatus.IN_PROGRESS,
        OrderStatus.CANCELLED,
        OrderStatus.REFUNDED,
      ],
      [OrderStatus.IN_PROGRESS]: [
        OrderStatus.COMPLETED,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.COMPLETED]: [
        OrderStatus.REFUNDED,
      ],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.REJECTED]: [],
      [OrderStatus.REFUNDED]: [],
      [OrderStatus.SHIPPED]: [],
    };

    return validTransitions[currentStatus] || [];
  }

  /**
   * Cek apakah order masih bisa dibatalkan
   * @param status - Status order saat ini
   * @returns boolean - true jika order masih bisa dibatalkan
   */
  canCancelOrder(status: OrderStatus): boolean {
    const cancellableStatuses = [
      OrderStatus.PENDING,
      OrderStatus.AWAITING_PAYMENT,
      OrderStatus.PAID,
      OrderStatus.SCHEDULED,
      OrderStatus.IN_PROGRESS // Tergantung business rule, mungkin masih bisa dibatalkan
    ];

    return cancellableStatuses.includes(status);
  }

  /**
   * Cek apakah order masih bisa direfund
   * @param status - Status order saat ini
   * @returns boolean - true jika order bisa direfund
   */
  canRefundOrder(status: OrderStatus): boolean {
    const refundableStatuses = [
      OrderStatus.PAID,
      OrderStatus.SCHEDULED,
      OrderStatus.COMPLETED,
    ];

    return refundableStatuses.includes(status);
  }

  async updateSnapToken(orderId: string, token: string): Promise<string> {
    const order = await this.orderRepo.findOne({ where: { id: orderId }, relations: ['customer'] });

    if (!order) {
      throw new NotFoundException(`Order with id ${orderId} not found`);
    }

    order.snapToken = token;
    await this.orderRepo.save(order);

    return token;
  }

  // orders.service.ts
  async generateSnapToken(orderId: string): Promise<string> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['customer', 'items', 'supplier'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // ✅ Payload untuk Midtrans Snap
    const payload = {
      transaction_details: {
        order_id: order.orderNumber,
        gross_amount: Number(order.total) + Number(order.shippingCost),
      },
      customer_details: {
        first_name: order.customer?.name || 'Customer',
        email: order.customer?.email || 'customer@example.com',
      },
    };

    // ✅ Call ke Midtrans Snap
    const midtrans = this.midtransService.getSnap(); // Pastikan ini instance snap
    const transaction = await midtrans.createTransaction(payload);

    const { token: snapToken } = transaction;

    // ✅ Simpan snapToken ke database (opsional)
    order.snapToken = snapToken;
    await this.orderRepo.save(order);

    return snapToken;
  }

  async cancelOrder(orderId: string): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Validasi apakah bisa dibatalkan
    if (!this.canCancelOrder(order.status)) {
      throw new BadRequestException(`Order with status "${order.status}" cannot be cancelled`);
    }

    // Update status menjadi CANCELLED
    order.status = OrderStatus.CANCELLED;

    await this.orderRepo.save(order);

    return order;
  }
}
