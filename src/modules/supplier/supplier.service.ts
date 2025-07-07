import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { In } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from 'src/entities/supplier.entity';
import { Account } from 'src/entities/account.entity';
import { BankAccount } from 'src/entities/bank-account.entity';
import { TaxIdentification } from 'src/entities/tax-identifications.entity';
import { Addresses } from 'src/entities/address.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { AccurateService } from 'src/integrate-accurate/accurate/accurate.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SupplierService {
  constructor(
    @InjectRepository(Supplier)
    private supplierRepo: Repository<Supplier>,

    @InjectRepository(Account)
    private accountRepository: Repository<Account>,

    @InjectRepository(BankAccount)
    private bankAccountRepo: Repository<BankAccount>,

    @InjectRepository(TaxIdentification)
    private taxRepo: Repository<TaxIdentification>,

    @InjectRepository(Addresses)
    private addressRepo: Repository<Addresses>,
    private readonly accurateService: AccurateService,
  ) {}

  private async generateSupplierCode(): Promise<string> {
    const prefix = 'SUP';
    const currentYear = new Date().getFullYear().toString().substr(-2);
    const totalSuppliers = await this.supplierRepo.count();
    const nextNumber = totalSuppliers + 1;
    const supplierCode = `${prefix}${currentYear}${nextNumber
      .toString()
      .padStart(4, '0')}`;

    const existingSupplier = await this.supplierRepo.findOne({
      where: { supplier_code: supplierCode },
    });
    if (existingSupplier) {
      const timestamp = Date.now().toString().substr(-4);
      return `${prefix}${currentYear}${timestamp}`;
    }
    return supplierCode;
  }

  private async formatDateToDDMMYYYY(date: Date): Promise<string> {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // bulan dimulai dari 0
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  async create(dto: CreateSupplierDto): Promise<Supplier> {
    const existingSupplier = await this.findByEmail(dto.email);
    const existingAccount = await this.accountRepository.findOne({
      where: { email: dto.email },
    });

    if (existingSupplier || existingAccount) {
      throw new ConflictException('Email already in use');
    }

    console.log('Supplier data before saving:', dto);
    const supplierCode = await this.generateSupplierCode();

    // ✅ Optional: safer npwp extraction
    const npwpFromTax = (dto.tax ?? []).find(
      (t) => t.taxType === 'npwp' && t.isActive && t.isPrimary,
    )?.taxNumber;

    const supplier = this.supplierRepo.create({
      name: dto.name,
      kategori: dto.kategori,
      address: dto.address,
      phone: dto.phone,
      email: dto.email,
      city: dto.city,
      province: dto.province,
      postalcode: dto.postalcode,
      npwp: npwpFromTax,
      accurate_id: dto.accurate_id ?? undefined,
      accurate_sc: dto.accurate_sc ?? undefined,
      xendit_id: dto.xendit_id ?? undefined,
      xendit_sc: dto.xendit_sc ?? undefined,
      astat: dto.astat ?? undefined,
      xstat: dto.xstat ?? undefined,
      supplier_code: supplierCode,
    });

    const savedSupplier = await this.supplierRepo.save(supplier);

    // ✅ Save addresses (array)
    if ((dto.addresses ?? []).length > 0) {
      const addressEntities = (dto.addresses ?? []).map((addr) =>
        this.addressRepo.create({
          name: addr.name,
          phone: addr.phone,
          address: addr.address,
          city: addr.city,
          province: addr.province,
          postalcode: addr.postalcode,
          is_default: addr.is_default ?? false,
          is_deleted: addr.is_deleted ?? false,
          ownerType: 'supplier',
          ownerId: savedSupplier.id,
        }),
      );
      await this.addressRepo.save(addressEntities);
    }

    // ✅ Save taxes (array)
    if ((dto.tax ?? []).length > 0) {
      const taxEntities = (dto.tax ?? []).map((t) =>
        this.taxRepo.create({
          taxType: t.taxType,
          taxNumber: t.taxNumber,
          taxName: t.taxName,
          registeredAddress: t.registeredAddress,
          isActive: t.isActive ?? true,
          isPrimary: t.isPrimary ?? false,
          ownerType: 'supplier',
          ownerId: savedSupplier.id,
        }),
      );
      await this.taxRepo.save(taxEntities);
    }

    // ✅ Save bank accounts
    if ((dto.bankAccounts ?? []).length > 0) {
      const bankEntities = (dto.bankAccounts ?? []).map((bank) =>
        this.bankAccountRepo.create({
          bankName: bank.bankName,
          accountNumber: bank.accountNumber,
          accountName: bank.accountName,
          branch: bank.branch,
          isPrimary: bank.isPrimary ?? false,
          ownerType: 'supplier',
          ownerId: savedSupplier.id,
        }),
      );
      await this.bankAccountRepo.save(bankEntities);
    }

    // ✅ Create internal account
    const passwordHash = await bcrypt.hash(dto.email, 10);
    const account = this.accountRepository.create({
      username: dto.email,
      email: dto.email,
      password: passwordHash,
      role: 'supplier',
      supplier: savedSupplier,
      customer_id: savedSupplier.id,
    });
    await this.accountRepository.save(account);

    // ✅ Build Accurate payload
    const activeTax = dto.tax?.find((t) => t.taxType === 'npwp' && t.isActive);
    const accuratePayload = {
      name: dto.name,
      transDate: await this.formatDateToDDMMYYYY(new Date()),
      vendorNo: supplierCode,
      email: dto.email,
      mobilePhone: dto.phone,
      billStreet: dto.address,
      billCity: dto.city,
      billProvince: dto.province,
      billZipCode: dto.postalcode,
      billCountry: 'ID',
      taxCity: dto.city,
      taxProvince: dto.province,
      taxZipCode: dto.postalcode,
      taxCountry: 'ID',
      taxStreet: activeTax?.registeredAddress || dto.address,
      npwpNo: activeTax?.taxNumber || '',
      wpName: activeTax?.taxName || dto.name,
      detailContact: [
        {
          name: dto.name,
          email: dto.email,
          mobilePhone: dto.phone,
          salutation: 'MR',
        },
      ],
    };

    // ✅ Sync to Accurate
    try {
      await this.accurateService.addVendorToAccurate(accuratePayload);
    } catch (error) {
      throw new InternalServerErrorException('Failed to sync vendor to Accurate', error.message);
    }

    return this.findOne(savedSupplier.id);
  }
  /**
   * Get all suppliers with bank accounts and tax identifications
   */
  async findAll(): Promise<{ data: Supplier[] }> {
    const suppliers = await this.supplierRepo.find();

    // ambil semua bank account & tax untuk suppliers
    const supplierIds = suppliers.map((s) => s.id);
    const [bankAccounts, taxIdentifications] = await Promise.all([
      this.bankAccountRepo.find({
        where: { ownerType: 'supplier', ownerId: In(supplierIds) },
      }),
      this.taxRepo.find({
        where: { ownerType: 'supplier', ownerId: In(supplierIds) },
      }),
    ]);

    // Map ke supplier
    const supplierMap = new Map<number, any>();
    for (const supplier of suppliers) {
      supplierMap.set(supplier.id, {
        ...supplier,
        bankAccounts: bankAccounts.filter((ba) => ba.ownerId === supplier.id),
        taxIdentifications: taxIdentifications.filter(
          (ti) => ti.ownerId === supplier.id,
        ),
      });
    }

    return { data: Array.from(supplierMap.values()) };
  }

  async findOne(id: number): Promise<Supplier & { tax?: TaxIdentification, bankAccounts?: BankAccount[] }> {
    const supplier = await this.supplierRepo.findOne({
      where: { id },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const taxData = await this.taxRepo.findOne({
      where: {
        ownerType: 'supplier',
        ownerId: id,
      },
    });

    const bankAccounts = await this.bankAccountRepo.find({
      where: {
        ownerType: 'supplier',
        ownerId: id,
      },
    });

    return {
      ...supplier,
      tax: taxData ?? undefined, // ✅ null diubah jadi undefined
      bankAccounts,
    };
  }

  async update(id: number, dto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await this.findOne(id);
    if (!supplier) throw new NotFoundException('Supplier not found');

    const { tax, bankAccounts, ...supplierData } = dto;

    Object.assign(supplier, supplierData);
    await this.supplierRepo.save(supplier);

    // Update or create tax info
    if (tax) {
      const existingTax = await this.taxRepo.findOne({
        where: {
          ownerType: 'supplier',
          ownerId: supplier.id,
        },
      });

      if (existingTax) {
        Object.assign(existingTax, {
          taxType: tax.taxType,
          taxNumber: tax.taxNumber,
          taxName: tax.taxName,
          registeredAddress: tax.registeredAddress,
          isActive: tax.isActive,
          isPrimary: tax.isPrimary,
        });
        await this.taxRepo.save(existingTax);
      } else {
        const newTax = this.taxRepo.create({
          taxType: tax.taxType,
          taxNumber: tax.taxNumber,
          taxName: tax.taxName,
          registeredAddress: tax.registeredAddress,
          isActive: tax.isActive ?? true,
          isPrimary: tax.isPrimary ?? false,
          ownerType: 'supplier',
          ownerId: supplier.id,
        });
        await this.taxRepo.save(newTax);
      }
    }

    // Replace all bank accounts
    if (bankAccounts && bankAccounts.length > 0) {
      await this.bankAccountRepo.delete({
        ownerType: 'supplier',
        ownerId: supplier.id,
      });

      const newBankAccounts = bankAccounts.map((bank) =>
        this.bankAccountRepo.create({
          bankName: bank.bankName,
          accountNumber: bank.accountNumber,
          accountName: bank.accountName,
          branch: bank.branch,
          isPrimary: bank.isPrimary ?? false,
          ownerType: 'supplier',
          ownerId: supplier.id,
        }),
      );

      await this.bankAccountRepo.save(newBankAccounts);
    }

    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const supplier = await this.findOne(id);
    if (!supplier) throw new NotFoundException('Supplier not found');

    await this.addressRepo.delete({
      ownerType: 'supplier',
      ownerId: id,
    });

    await this.bankAccountRepo.delete({
      ownerType: 'supplier',
      ownerId: id,
    });

    await this.taxRepo.delete({
      ownerType: 'supplier',
      ownerId: id,
    });

    // Optional: hapus akun jika ada entitas account
    await this.accountRepository.delete({ supplier: { id } }); // <-- Pastikan ini sesuai struktur kamu
    // Hapus alamat terkait
    await this.accurateService.deleteVendor(supplier.supplier_code);
    await this.supplierRepo.delete(id);
  }

  async findByEmail(email: string): Promise<Supplier | null> {
    return this.supplierRepo.findOne({ where: { email } });
  }
}
