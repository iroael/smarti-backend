import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from 'src/entities/supplier.entity';
import { Account } from 'src/entities/account.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SupplierService {
  constructor(
    @InjectRepository(Supplier)
    private supplierRepo: Repository<Supplier>,

    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
  ) {}
  async create(dto: CreateSupplierDto): Promise<Supplier> {
    const existingSupplier = await this.findByEmail(dto.email);
    const existingAccount = await this.accountRepository.findOne({
      where: { email: dto.email },
    });

    if (existingSupplier || existingAccount) {
      throw new ConflictException('Email already in use');
    }

    // Simpan supplier dulu
    const supplier = this.supplierRepo.create(dto);
    const savedSupplier = await this.supplierRepo.save(supplier);

    // Simpan akun login
    const passwordHash = await bcrypt.hash(dto.email, 10); // ← disarankan ganti dengan field password jika ada

    const account = this.accountRepository.create({
      username: dto.email,
      email: dto.email,
      password: passwordHash,
      role: 'supplier',
      supplier: savedSupplier, // ← relasi ke supplier
    });

    await this.accountRepository.save(account);

    return savedSupplier;
  }

  async findAll(): Promise<{ data: Supplier[] }> {
    const suppliers = await this.supplierRepo.find();
    return { data: suppliers };
  }

  async findOne(id: number): Promise<Supplier> {
    const supplier = await this.supplierRepo.findOne({ where: { id } });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  async update(id: number, dto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await this.findOne(id);
    Object.assign(supplier, dto);
    return this.supplierRepo.save(supplier);
  }

  async remove(id: number): Promise<void> {
    const result = await this.supplierRepo.delete(id);
    if (result.affected === 0)
      throw new NotFoundException('Supplier not found');
  }

  async findByEmail(email: string): Promise<Supplier | null> {
    return this.supplierRepo.findOne({ where: { email } });
  }

}
