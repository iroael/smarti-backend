// src/tax/tax.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tax } from 'src/entities/tax.entity';
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateProductTaxDto } from './dto/update-tax.dto';

@Injectable()
export class TaxService {
  constructor(
    @InjectRepository(Tax)
    private taxRepository: Repository<Tax>,
  ) {}

  async create(createTaxDto: CreateTaxDto): Promise<Tax> {
    const tax = this.taxRepository.create(createTaxDto);
    return await this.taxRepository.save(tax);
  }

  async findAll(): Promise<Tax[]> {
    return await this.taxRepository.find();
  }

  async findOne(id: number): Promise<Tax> {
    const tax = await this.taxRepository.findOne({ where: { id } });
    if (!tax) throw new NotFoundException(`Tax with id ${id} not found`);
    return tax;
  }

  async update(id: number, updateTaxDto: UpdateProductTaxDto): Promise<Tax> {
    const tax = await this.findOne(id);
    Object.assign(tax, updateTaxDto);
    return await this.taxRepository.save(tax);
  }

  async remove(id: number): Promise<void> {
    const tax = await this.findOne(id);
    await this.taxRepository.remove(tax);
  }
}
