import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaxIdentification } from 'src/entities/tax-identifications.entity';
import { CreateTaxIdentificationDto } from './dto/create-tax-identifications.dto';
import { UpdateTaxIdentificationDto } from './dto/update-tax-identifications.dto';

@Injectable()
export class TaxIdentificationsService {
  constructor(
    @InjectRepository(TaxIdentification)
    private readonly taxRepo: Repository<TaxIdentification>,
  ) {}

  async create(dto: CreateTaxIdentificationDto): Promise<TaxIdentification> {
    const tax = this.taxRepo.create(dto);
    return this.taxRepo.save(tax);
  }

  async findAllByOwner(ownerType: 'customer' | 'supplier', ownerId: number): Promise<TaxIdentification[]> {
    return this.taxRepo.find({
      where: { ownerType, ownerId },
      order: { isPrimary: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<TaxIdentification> {
    const tax = await this.taxRepo.findOne({ where: { id } });
    if (!tax) throw new NotFoundException(`TaxIdentification with ID ${id} not found`);
    return tax;
  }

  async update(id: number, dto: UpdateTaxIdentificationDto): Promise<TaxIdentification> {
    const tax = await this.findOne(id);
    const updated = this.taxRepo.merge(tax, dto);
    return this.taxRepo.save(updated);
  }

  async setPrimary(id: number) {
    const tax = await this.taxRepo.findOne({ where: { id } });
    if (!tax) throw new NotFoundException('Tax identification not found');

    await this.taxRepo.update(
      { ownerId: tax.ownerId, ownerType: tax.ownerType },
      { isPrimary: false },
    );

    tax.isPrimary = true;
    return this.taxRepo.save(tax);
  }

  async toggleActive(id: number) {
    const tax = await this.taxRepo.findOne({ where: { id } });
    if (!tax) throw new NotFoundException('Tax identification not found');

    tax.isActive = !tax.isActive;
    return this.taxRepo.save(tax);
  }

  async remove(id: number): Promise<void> {
    const tax = await this.findOne(id);
    await this.taxRepo.remove(tax);
  }
}
