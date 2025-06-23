import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Order } from '../../entities/order.entity';
import { OrderItem } from '../../entities/order-item.entity';
import { Product } from '../../entities/product.entity';
import { Customer } from '../../entities/customer.entity';
import { Supplier } from '../../entities/supplier.entity';
import { OrderItemTax } from '../../entities/order-item-tax.entity';
import { Tax } from '../../entities/tax.entity';
import { Addresses } from '../../entities/address.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { SupplierSupplierAccess } from 'src/entities/supplier-supplier-access.entity';
import { MidtransService } from '../midtrans/midtrans.service';
import { OrderStatus } from 'src/common/enums/order-status.enum';

@Injectable()
export class OrdersService {
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

    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,

    @InjectRepository(SupplierSupplierAccess)
    private readonly supplierAccessRepo: Repository<SupplierSupplierAccess>,

    @InjectRepository(Addresses)
    private readonly addressRepo: Repository<Addresses>,

    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,

    private readonly midtransService: MidtransService,
  ) {}

  async generateOrderNumber(): Promise<string> {
    const datePart = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const prefix = `ORD-${datePart}`;

    const latestOrder = await this.orderRepo
      .createQueryBuilder('order')
      .where('order.orderNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('order.orderNumber', 'DESC')
      .getOne();

    let nextNumber = 1;
    if (latestOrder) {
      const lastNum = parseInt(latestOrder.orderNumber.slice(-5), 10);
      nextNumber = lastNum + 1;
    }

    return `${prefix}-${String(nextNumber).padStart(5, '0')}`;
  }

  // async create(dto: CreateOrderDto): Promise<{ order: Order }> {
  // async create(dto: CreateOrderDto): Promise<{ order: Order; snapToken: string }> {
    // const customer = await this.customerRepo.findOne({
    //   where: { id: dto.customerId },
    // });
    // if (!customer) throw new NotFoundException('Customer not found');

    // const firstProduct = await this.productRepo.findOne({
    //   where: { id: dto.items[0].productId },
    //   relations: ['supplier'],
    // });

    // if (!firstProduct) throw new BadRequestException('Invalid first product');
    // const supplier = firstProduct.supplier;
    // if (!supplier) throw new BadRequestException('Product has no supplier');

    // const orderNumber = await this.generateOrderNumber();
    // let total = 0;
    // const orderItems: OrderItem[] = [];

    // for (const item of dto.items) {
    //   const product = await this.productRepo.findOne({
    //     where: { id: item.productId },
    //     relations: ['prices', 'supplier'],
    //   });

    //   if (!product)
    //     throw new BadRequestException(`Invalid product ID: ${item.productId}`);

    //   if (product.supplier.id !== supplier.id) {
    //     throw new BadRequestException(
    //       'All products in an order must belong to the same supplier',
    //     );
    //   }

    //   const latestPrice = product.prices?.[product.prices.length - 1];
    //   if (!latestPrice)
    //     throw new BadRequestException(
    //       `No price available for product ID: ${item.productId}`,
    //     );

    //   total += Number(latestPrice.dpp_jual) * item.quantity;

    //   const orderItem = this.orderItemRepo.create({
    //     product,
    //     quantity: item.quantity,
    //     price: latestPrice.h_jual_b,
    //   });

    //   orderItems.push(orderItem);
    // }

    // const order = this.orderRepo.create({
    //   customer,
    //   supplier,
    //   orderNumber,
    //   orderDate: new Date(),
    //   status: OrderStatus.PENDING,
    //   total,
    //   items: orderItems,
    // });

    // const savedOrder = await this.orderRepo.save(order);

    // const snapToken = await this.midtransService.generateSnapToken({
    //   orderId: savedOrder.orderNumber,
    //   amount: total,
    //   customer: {
    //     name: customer.name,
    //     email: customer.email,
    //     phone: customer.phone,
    //   },
    // });

    // return { order: savedOrder };
    // return { order: savedOrder, snapToken };
  // }

  async create(dto: CreateOrderDto): Promise<{ order: Order }> {
    const customer = await this.customerRepo.findOne({ where: { id: dto.customerId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const firstProduct = await this.productRepo.findOne({
      where: { id: dto.items[0].productId },
      relations: ['supplier'],
    });
    if (!firstProduct) throw new BadRequestException('Invalid first product');
    const supplier = firstProduct.supplier;

    const defaultTax = await this.taxRepo.findOne({ where: { name: 'PPN 11%' } });
    if (!defaultTax) throw new BadRequestException('Default tax not found');

    const orderNumber = await this.generateOrderNumber();
    let total = 0;
    const orderItems: OrderItem[] = [];

    for (const itemDto of dto.items) {
      const product = await this.productRepo.findOne({
        where: { id: itemDto.productId },
        relations: ['prices', 'supplier'],
      });
      if (!product) throw new BadRequestException(`Invalid product ID: ${itemDto.productId}`);
      if (product.supplier.id !== supplier.id)
        throw new BadRequestException('All products must be from the same supplier');

      const latestPrice = product.prices?.[product.prices.length - 1];
      if (!latestPrice) throw new BadRequestException(`No price for product ID: ${itemDto.productId}`);

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

    // 🧾 Create main order
    const mainOrder = this.orderRepo.create({
      customer,
      supplier,
      orderNumber,
      orderDate: new Date(),
      status: OrderStatus.PENDING,
      total,
      notes: dto.notes,
      deliveryAddress: dto.deliveryAddress,
      shippingCost: dto.shippingCost || 0,
      items: orderItems,
    });

    const savedOrder = await this.orderRepo.save(mainOrder);

    // 🔁 Check if supplier (e.g. PLN) has a parent supplier (e.g. KSS)
    const access = await this.supplierAccessRepo.findOne({
      where: { viewer: { id: supplier.id } },
      relations: ['target'],
    });

    // console.log('order service => ', access)

    if (access) {
      const subSupplier = access.target;

      const addressSupplier = await this.addressRepo.findOne({
        where: {
          ownerType: 'supplier',
          ownerId: supplier.id,
          is_default: true,
        },
      });

      if (!addressSupplier) {
        throw new BadRequestException(`Default address for supplier ${supplier.name} not found`);
      }

      // console.log(subSupplier)
      const subOrderItems = await Promise.all(
        orderItems.map(async (item) => {
          const subProduct = await this.productRepo.findOne({
            where: {
              product_code: item.product.product_code,
              supplier: { id: subSupplier.id },
            },
            relations: ['prices'],
          });

          if (!subProduct) throw new BadRequestException(`Sub-product not found in supplier ${subSupplier.name}`);

          const latestPrice = subProduct.prices?.[subProduct.prices.length - 1];
          if (!latestPrice) throw new BadRequestException('No price in sub supplier');

          const quantity = item.quantity;
          const price = Number(latestPrice.h_jual_b);
          const subtotal = price * quantity;
          const taxAmount = (subtotal * Number(defaultTax.rate)) / 100;

          return this.orderItemRepo.create({
            product: subProduct,
            quantity,
            price,
            taxes: [
              this.orderItemTaxRepo.create({
                tax: defaultTax,
                taxRate: Number(defaultTax.rate),
                taxAmount,
              }),
            ],
          });
        }),
      );

      console.log('subOrderItems => ', subOrderItems)
      console.log('==============================')
      console.log('supplier', supplier)
      console.log('==============================')
      const subOrder = this.orderRepo.create({
        customer: supplier, // 👉 PLN sebagai customer dari KSS
        supplier: subSupplier,
        orderNumber: await this.generateOrderNumber(),
        orderDate: new Date(),
        status: OrderStatus.PENDING,
        notes: dto.notes,
        deliveryAddress: addressSupplier.id,
        total: subOrderItems.reduce(
          (sum, item) =>
            sum +
            item.quantity * Number(item.price) +
            item.taxes.reduce((tSum, tax) => tSum + Number(tax.taxAmount), 0),
          0
        ),
        parentOrder: savedOrder, // 🔗 parent-child
        items: subOrderItems,
      });

      console.log('subOrder ======= ',subOrder)

      await this.orderRepo.save(subOrder);
    }

    return { order: savedOrder };
  }

  // async findAddressSupplier(ownerId: number, ownerType: 'customer' | 'supplier'): Promise<Addresses[]> {
  //   return this.addressRepo.find({
  //     where: {
  //       ownerId,
  //       ownerType,
  //       is_deleted: false,
  //     },
  //   });
  // }

  async findAll(): Promise<{ data: Order[] }> {
    const orders = await this.orderRepo.find({
      relations: ['customer', 'supplier', 'items', 'items.product'],
      order: { orderDate: 'DESC' },
    });
    return { data: orders };
  }

  async findAllByCustomer(customerId: number): Promise<{ data: Order[] }> {
    const orders = await this.orderRepo.find({
      where: { customer: { id: customerId } },
      relations: ['customer', 'supplier', 'items', 'items.product'],
      order: { orderDate: 'DESC' },
    });
    return { data: orders };
  }

  async findAllBySupplier(supplierId: number): Promise<{ data: Order[] }> {
    const orders = await this.orderRepo.find({
      where: { supplier: { id: supplierId } },
      relations: ['customer', 'supplier', 'items', 'items.product'],
      order: { orderDate: 'DESC' },
    });
    return { data: orders };
  }

  // New: for supplier as customer (outgoing orders)
  async findMyOrders(supplierId: number): Promise<{ data: Order[] }> {
    if (!supplierId) throw new BadRequestException('supplierId is required');

    // Ambil semua supplier yang memberikan akses ke supplierId (misalnya KSS memberi akses ke PLNE)
    const accessRecords = await this.supplierAccessRepo.find({
      where: { viewer: { id: supplierId } },
      relations: ['target'],
    });

    console.log(accessRecords)

    const allowedSupplierIds = accessRecords.map((access) => access.target.id);

    // Cari order di mana PLNE (supplierId) menjadi customer dan supplier-nya memberikan akses
    const orders = await this.orderRepo.find({
      where: {
        // customer: { id: supplierId },
        supplier: In(allowedSupplierIds),
      },
      relations: ['supplier', 'items', 'items.product'],
      order: { orderDate: 'DESC' },
    });

    console.log('-----------------------------------');
    console.log('order findMyOrders', orders)

    return { data: orders };
  }

  // New: for supplier to view incoming orders
  // async findIncoming(supplierId: number): Promise<{ data: Order[] }> {
  //   // console.log(supplierId)
  //   if (!supplierId) throw new BadRequestException('supplierId is required');
  //   console.log('findIncoming', supplierId);
  //   const orders = await this.orderRepo.find({
  //     where: { supplier: { id: supplierId } },
  //     relations: ['customer', 'items', 'items.product'],
  //     order: { orderDate: 'DESC' },
  //   });

  //   console.log(orders)

  //   return { data: orders };
  // }

  async findIncoming(supplierId: number): Promise<{ data: Order[] }> {
    if (!supplierId) throw new BadRequestException('supplierId is required');
    console.log('findIncoming', supplierId);

    const orders = await this.orderRepo.find({
      where: { supplier: { id: supplierId } },
      relations: ['customer', 'items', 'items.product'],
      order: { orderDate: 'DESC' },
    });

    for (const order of orders) {
      if (!order.customer && order.customerId) {
        const access = await this.supplierAccessRepo.findOne({
          where: {
            target: { id: supplierId },
            viewer: { id: order.customerId },
          },
          relations: ['viewer'],
        });

        if (access?.viewer) {
          // Simulate customer using viewer (Supplier)
          const simulatedCustomer = {
            id: access.viewer.id,
            name: access.viewer.name,
            email: access.viewer.email,
            phone: access.viewer.phone,
            address: access.viewer.address,
            city: '', // optional: from addressRepo if needed
            province: '',
            postalcode: '',
            npwp: '', // optional
            createdAt: access.viewer.created_at,
          };

          // Optional: resolve delivery address detail if order.deliveryAddress is number (ID)
          if (order.deliveryAddress) {
            const addr = await this.addressRepo.findOne({
              where: { id: Number(order.deliveryAddress) },
            });
            if (addr) {
              simulatedCustomer.address = addr.address;
              simulatedCustomer.city = addr.city;
              simulatedCustomer.province = addr.province;
              simulatedCustomer.postalcode = addr.postalcode;
            }
          }

          order.customer = simulatedCustomer as any; // If needed, type helper can be defined
        }
      }
    }

    return { data: orders };
  }


  async findOne(id: number): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['customer', 'supplier', 'items', 'items.product'],
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async delete(id: number): Promise<void> {
    const result = await this.orderRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Order not found');
    }
  }

  async findOrderById(orderNumber: string): Promise<Order | null> {
    return this.orderRepo.findOne({
      where: { orderNumber },
      relations: ['customer'],
    });
  }

  async updateOrderStatus(orderNumber: string, status: string): Promise<void> {
    const order = await this.orderRepo.findOne({ where: { orderNumber } });
    if (!order) throw new NotFoundException('Order not found');

    if (!Object.values(OrderStatus).includes(status as OrderStatus)) {
      throw new BadRequestException(`Invalid order status: ${status}`);
    }

    order.status = status as OrderStatus;
    await this.orderRepo.save(order);
  }
}
