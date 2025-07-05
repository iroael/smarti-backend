import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, EntityManager } from 'typeorm';
import { PurchaseOrder } from 'src/entities/purchase/purchase-order.entity';
import { PurchaseOrderItem } from 'src/entities/purchase/purchase-order-item.entity';
import { PurchaseOrderItemTax } from 'src/entities/purchase/purchase-order-item-tax.entity';
import { PurchaseRelateOrder } from 'src/entities/purchase/purchase-relate-order.entity';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { Supplier } from 'src/entities/supplier.entity';
import { Product } from 'src/entities/product/product.entity';
import { Tax } from 'src/entities/tax.entity';
import { Addresses } from 'src/entities/address.entity';
import { Customer } from 'src/entities/customer.entity';
import { Order } from 'src/entities/orders/order.entity';
import { PurchaseOrderStatus } from 'src/common/enums/purchase-status.enum';
import { plainToInstance } from 'class-transformer';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { CreatePurchaseRelateOrderDto } from './dto/create-purchase-relate-order.dto';

interface CalculatedTax {
  taxId: number;
  taxRate: number;
  taxAmount: number;
}

interface CalculatedItem {
  productId: number;
  quantity: number;
  price: number;
  subtotal: number;
  taxes: CalculatedTax[];
}

interface PurchaseOrderCalculation {
  items: CalculatedItem[];
  subtotal: number;
  taxTotal: number;
  shippingCost: number;
  total: number;
}

@Injectable()
export class PurchaseOrderService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(PurchaseOrder)
    private poRepo: Repository<PurchaseOrder>,
  ) {}

  private generatePoNumber(): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PO-${timestamp}-${random}`;
  }

  /**
   * Create Purchase Order from related orders only
   */
  // Fix for the create method in purchase-order.service.ts
  async create(dto: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    return await this.dataSource.transaction(async (manager) => {
      // Validate required fields
      if (!dto.relateOrders || dto.relateOrders.length === 0) {
        throw new BadRequestException('relateOrders are required to create a Purchase Order');
      }
      if (!dto.customerId || !dto.supplierId) {
        throw new BadRequestException('customerId and supplierId are required');
      }

      // Validate address if provided
      if (dto.addressId) {
        await this.validateAddress(manager, dto.addressId);
      }

      // DEBUG: Log input data
      console.log('=== DEBUG CREATE PURCHASE ORDER ===');
      console.log('Input DTO:', JSON.stringify(dto, null, 2));
      console.log('Relate Orders Count:', dto.relateOrders.length);

      // Calculate from related orders
      const calculation = await this.calculateFromRelatedOrders(manager, dto.relateOrders);

      // Create PurchaseOrder
      const po = new PurchaseOrder();
      po.poNumber = this.generatePoNumber();
      po.orderDate = dto.orderDate ? new Date(dto.orderDate) : new Date();
      po.status = dto.status || PurchaseOrderStatus.DRAFT;
      po.customerId = dto.customerId;
      po.supplierId = dto.supplierId;
      // Fix: Only assign addressId if dto.addressId exists, otherwise leave undefined
      if (dto.addressId) {
        po.addressId = dto.addressId;
      }
      // Fix: Only assign notes if dto.notes exists, otherwise leave undefined
      if (dto.notes) {
        po.notes = dto.notes;
      }
      po.subtotal = calculation.subtotal;
      po.taxTotal = calculation.taxTotal;
      po.shippingCost = calculation.shippingCost;
      po.total = calculation.total;

      const savedPo = await manager.save(po);

      // Save items and taxes
      await this.savePurchaseOrderItems(manager, savedPo, calculation.items);

      // Save relate orders
      await this.savePurchaseRelateOrders(manager, savedPo, dto.relateOrders);

      // DEBUG: Verify saved data
      const savedRelateOrders = await manager.find(PurchaseRelateOrder, {
        where: { purchaseOrder: { id: savedPo.id } }
      });
      console.log('=== SAVED RELATE ORDERS ===');
      console.log('Saved Relate Orders Count:', savedRelateOrders.length);
      console.log('Saved Order IDs:', savedRelateOrders.map(r => r.order?.id || 'No order'));

      return savedPo;
    });
  }

  /**
   * Calculate PO from related orders - aggregate items by product
   */
  private async calculateFromRelatedOrders(
    manager: EntityManager,
    relateOrders: CreatePurchaseRelateOrderDto[]
  ): Promise<PurchaseOrderCalculation> {
    const orderIds = relateOrders.map((r) => r.orderId);

    console.log('=== CALCULATE FROM RELATED ORDERS ===');
    console.log('Order IDs to process:', orderIds);

    const orders = await manager.find(Order, {
      where: { id: In(orderIds) },
      relations: ['items', 'items.product', 'items.taxes.tax'],
    });

    if (!orders.length || orders.length !== orderIds.length) {
      const foundIds = orders.map(o => o.id);
      const missingIds = orderIds.filter(id => !foundIds.includes(id));
      throw new NotFoundException(`Orders not found: ${missingIds.join(', ')}`);
    }

    // Aggregate items by product
    const itemsMap = new Map<number, CalculatedItem>();

    for (const order of orders) {
      for (const item of order.items) {
        const productId = item.product.id;
        const quantity = item.quantity;
        const price = Number(item.price);
        const subtotal = quantity * price;
        // Calculate taxes for this item
        const taxes = item.taxes.map((taxEntry) => ({
          taxId: taxEntry.tax.id,
           taxRate: Number(taxEntry.taxRate),
          taxAmount: Number(taxEntry.taxAmount),
        }));

        if (itemsMap.has(productId)) {
          const existing = itemsMap.get(productId)!;
          const oldQuantity = existing.quantity;
          const oldSubtotal = existing.subtotal;

          existing.quantity += quantity;
          existing.subtotal += subtotal;

          // For price, we could take average or use the latest price
          // Here we'll use weighted average based on quantity
          const totalQuantity = existing.quantity;
          const previousQuantity = totalQuantity - quantity;
          existing.price = ((existing.price * previousQuantity) + (price * quantity)) / totalQuantity;

          // Aggregate taxes by taxId
          existing.taxes = this.aggregateTaxes([...existing.taxes, ...taxes]);

          console.log(`  - Aggregated: qty ${oldQuantity}+${quantity}=${existing.quantity}, subtotal ${oldSubtotal}+${subtotal}=${existing.subtotal}`);
        } else {
          itemsMap.set(productId, {
            productId,
            quantity,
            price,
            subtotal,
            taxes,
          });
          console.log(`  - Added new product ${productId}`);
        }
      }
    }

    const items = Array.from(itemsMap.values());
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const taxTotal = items
      .flatMap((item) => item.taxes)
      .reduce((sum, tax) => sum + tax.taxAmount, 0);
    const shippingCost = orders.reduce((sum, order) => sum + Number(order.shippingCost || 0), 0);
    const total = subtotal + taxTotal + shippingCost;
    return {
      items,
      subtotal,
      taxTotal,
      shippingCost,
      total,
    };
  }

  /**
   * Aggregate taxes by taxId to avoid duplicates
   */
  private aggregateTaxes(taxes: CalculatedTax[]): CalculatedTax[] {
    const taxMap = new Map<number, CalculatedTax>();

    taxes.forEach((tax) => {
      const existing = taxMap.get(tax.taxId);
      if (existing) {
        existing.taxAmount += tax.taxAmount;
      } else {
        taxMap.set(tax.taxId, { ...tax });
      }
    });

    return Array.from(taxMap.values());
  }

  /**
   * Validate address exists
   */
  private async validateAddress(manager: EntityManager, addressId: number): Promise<void> {
    const address = await manager.findOne(Addresses, { where: { id: addressId } });
    if (!address) {
      throw new NotFoundException(`Address with ID ${addressId} not found`);
    }
  }

  /**
   * Save purchase order items and their taxes
   */
  private async savePurchaseOrderItems(
    manager: EntityManager,
    purchaseOrder: PurchaseOrder,
    items: CalculatedItem[]
  ): Promise<void> {
    console.log('=== SAVING PURCHASE ORDER ITEMS ===');
    console.log('Items to save:', items.length);

    // Batch load all required entities
    const productIds = items.map((item) => item.productId);
    const taxIds = [...new Set(items.flatMap((item) => item.taxes.map((tax) => tax.taxId)))];

    const [products, taxes] = await Promise.all([
      manager.find(Product, { where: { id: In(productIds) } }),
      manager.find(Tax, { where: { id: In(taxIds) } }),
    ]);

    const productMap = new Map(products.map((p) => [p.id, p]));
    const taxMap = new Map(taxes.map((t) => [t.id, t]));

    for (const itemData of items) {
      const product = productMap.get(itemData.productId);
      if (!product) {
        throw new NotFoundException(`Product with ID ${itemData.productId} not found`);
      }

      const poItem = new PurchaseOrderItem();
      poItem.purchaseOrder = purchaseOrder;
      poItem.product = product;
      poItem.quantity = itemData.quantity;
      poItem.price = itemData.price;
      poItem.subtotal = itemData.subtotal;

      const savedItem = await manager.save(poItem);
      console.log(`Saved item for product ${itemData.productId}: qty=${itemData.quantity}, subtotal=${itemData.subtotal}`);

      // Save taxes for this item
      for (const taxData of itemData.taxes) {
        const tax = taxMap.get(taxData.taxId);
        if (!tax) {
          throw new NotFoundException(`Tax with ID ${taxData.taxId} not found`);
        }

        const taxItem = new PurchaseOrderItemTax();
        taxItem.purchaseOrderItem = savedItem;
        taxItem.tax = tax;
        taxItem.taxRate = taxData.taxRate;
        taxItem.taxAmount = taxData.taxAmount;

        await manager.save(taxItem);
      }
    }
  }

  /**
   * Save purchase relate orders
   */
  private async savePurchaseRelateOrders(
    manager: EntityManager,
    purchaseOrder: PurchaseOrder,
    relateOrders: CreatePurchaseRelateOrderDto[]
  ): Promise<void> {
    console.log('=== SAVING PURCHASE RELATE ORDERS ===');
    console.log('Relate orders to save:', relateOrders.length);

    const orderIds = relateOrders.map((rel) => rel.orderId);
    const orders = await manager.find(Order, { where: { id: In(orderIds) } });

    console.log('Found orders for relating:', orders.length);

    if (orders.length !== orderIds.length) {
      const foundIds = orders.map(o => o.id);
      const missingIds = orderIds.filter(id => !foundIds.includes(id));
      throw new NotFoundException(`Orders not found for relating: ${missingIds.join(', ')}`);
    }

    const orderMap = new Map(orders.map((o) => [o.id, o]));

    for (const rel of relateOrders) {
      const order = orderMap.get(rel.orderId);
      if (!order) {
        throw new NotFoundException(`Order with ID ${rel.orderId} not found`);
      }

      const relate = new PurchaseRelateOrder();
      relate.purchaseOrder = purchaseOrder;
      relate.order = order;

      const savedRelate = await manager.save(relate);
      console.log(`Saved relate order: PO ${purchaseOrder.id} -> Order ${order.id}`);
    }
  }

  // ===== EXISTING METHODS (unchanged) =====

  async findAll(status?: string) {
    const normalizedStatus = status?.toLowerCase() as PurchaseOrderStatus;

    const isValidStatus = Object.values(PurchaseOrderStatus).includes(normalizedStatus);

    if (status && !isValidStatus) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }

    const where = isValidStatus ? { status: normalizedStatus } : {};

    return this.poRepo.find({
      where,
      relations: ['items', 'supplier', 'address', 'customer'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const po = await this.poRepo.findOne({
      where: { id },
      relations: ['items', 'items.product', 'items.taxes', 'supplier', 'address', 'customer', 'relateOrders'],
    });

    if (!po) {
      throw new NotFoundException('Purchase Order not found');
    }

    return po;
  }

  async update(id: string, dto: UpdatePurchaseOrderDto) {
    const existing = await this.findOne(id);
    const updated = plainToInstance(PurchaseOrder, {
      ...existing,
      ...dto,
    });

    await this.poRepo.save(updated);
    return this.findOne(id);
  }

  async remove(id: string) {
    const po = await this.findOne(id);
    await this.poRepo.remove(po);
    return { message: 'Purchase Order deleted successfully' };
  }

  async confirm(id: string) {
    await this.poRepo.update(id, {
      status: PurchaseOrderStatus.ORDERED,
    });

    return this.findOne(id);
  }

  async cancel(id: string) {
    await this.poRepo.update(id, {
      status: PurchaseOrderStatus.CANCELLED,
    });

    return this.findOne(id);
  }
}
