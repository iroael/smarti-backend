import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerSupplierAccess } from 'src/entities/customer-supplier-access.entity';
import { SupplierSupplierAccess } from 'src/entities/supplier-supplier-access.entity';

@Injectable()
export class AccessService {
  constructor(
    @InjectRepository(CustomerSupplierAccess)
    private customerAccessRepo: Repository<CustomerSupplierAccess>,

    @InjectRepository(SupplierSupplierAccess)
    private supplierAccessRepo: Repository<SupplierSupplierAccess>,
  ) {}

  async giveCustomerAccess(customerId: number, supplierId: number) {
    const access = this.customerAccessRepo.create({
      customer: { id: customerId },
      supplier: { id: supplierId },
    });
    return this.customerAccessRepo.save(access);
  }

  async removeCustomerAccess(customerId: number, supplierId: number) {
    return this.customerAccessRepo.delete({
      customer: { id: customerId },
      supplier: { id: supplierId },
    });
  }

  async giveSupplierAccess(viewerId: number, targetId: number) {
    const access = this.supplierAccessRepo.create({
      viewer: { id: viewerId },
      target: { id: targetId },
    });
    return this.supplierAccessRepo.save(access);
  }

  async removeSupplierAccess(viewerId: number, targetId: number) {
    return this.supplierAccessRepo.delete({
      viewer: { id: viewerId },
      target: { id: targetId },
    });
  }
}
