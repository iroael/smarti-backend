import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Customer } from '../../entities/customer.entity';
import { BankAccount } from 'src/entities/bank-account.entity';
import { TaxIdentification } from 'src/entities/tax-identifications.entity';
import { Account } from 'src/entities/account.entity';
import { Addresses } from 'src/entities/address.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import * as bcrypt from 'bcrypt';
import { AccurateService } from 'src/integrate-accurate/accurate/accurate.service';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,

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

  private formatDateToDDMMYYYY(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // bulan dimulai dari 0
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private async generateCustomerCode(): Promise<string> {
    const lastCustomer = await this.customerRepository.find({
      order: { id: 'DESC' }, // atau createdAt jika kamu punya
      take: 1,
    });

    let lastNumber = 0;

    if (lastCustomer.length > 0 && lastCustomer[0].customer_code) {
      const code = lastCustomer[0].customer_code;
      const numberMatch = typeof code === 'string' && code.match(/CUST-(\d+)/);
      if (numberMatch) {
        lastNumber = parseInt(numberMatch[1], 10);
      }
    }

    const nextNumber = lastNumber + 1;
    return `CUST-${nextNumber.toString().padStart(4, '0')}`;
  }

  // Helper to group array by key
  private groupBy<T>(array: T[], keyFn: (item: T) => string | number): Record<string, T[]> {
    return array.reduce((acc, item) => {
      const key = keyFn(item);
        acc[key] = acc[key] || [];
        acc[key].push(item);
        return acc;
      },
    {} as Record<string, T[]>);
  }

  async findAll(): Promise<(Customer & {
    addresses: Addresses[],
    tax: TaxIdentification[],
    bankAccounts: BankAccount[]
  })[]> {
    const customers = await this.customerRepository.find();

    if (!customers.length) return [];

    const customerIds = customers.map((c) => c.id);

    const [taxList, bankList, addressList] = await Promise.all([
      this.taxRepo.find({
        where: {
          ownerType: 'customer',
          ownerId: In(customerIds),
        },
      }),
      this.bankAccountRepo.find({
        where: {
          ownerType: 'customer',
          ownerId: In(customerIds),
        },
      }),
      this.addressRepo.find({
        where: {
          ownerType: 'customer',
          ownerId: In(customerIds),
        },
      }),
    ]);

    const groupBy = <T, K extends keyof any>(
      array: T[],
      keyGetter: (item: T) => K,
    ): Record<K, T[]> =>
      array.reduce((result, currentItem) => {
        const key = keyGetter(currentItem);
        if (!result[key]) {
          result[key] = [];
        }
        result[key].push(currentItem);
        return result;
      }, {} as Record<K, T[]>);

    const taxGrouped = groupBy(taxList, (t) => t.ownerId);
    const bankGrouped = groupBy(bankList, (b) => b.ownerId);
    const addressGrouped = groupBy(addressList, (a) => a.ownerId);

    return customers.map((customer) => ({
      ...customer,
      tax: taxGrouped[customer.id] || [],
      bankAccounts: bankGrouped[customer.id] || [],
      addresses: addressGrouped[customer.id] || [],
    }));
  }


  async findOne(id: number): Promise<Customer & {
    addresses?: Addresses[],
    tax?: TaxIdentification[],
    bankAccounts?: BankAccount[]
  }> {
    const customer = await this.customerRepository.findOne({
      where: { id },
    });

    if (!customer) throw new NotFoundException('Customer not found');

    const taxData = await this.taxRepo.find({
      where: {
        ownerType: 'customer',
        ownerId: id,
      },
    });

    const addressData = await this.addressRepo.find({
      where: {
        ownerType: 'customer',
        ownerId: id,
      },
    });

    const bankAccounts = await this.bankAccountRepo.find({
      where: {
        ownerType: 'customer',
        ownerId: id,
      },
    });

    return {
      id: customer.id,
      customer_code: customer.customer_code,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      npwp: customer.npwp,
      address: customer.address,
      city: customer.city,
      province: customer.province,
      postalcode: customer.postalcode,
      createdAt: customer.createdAt,
      // Data tambahan
      addresses: addressData || [],
      tax: taxData || [],
      bankAccounts: bankAccounts || [],
    };
  }

  async findByEmail(email: string): Promise<Customer | null> {
    return this.customerRepository.findOne({ where: { email } });
  }

  async findByEmailWithAccount(email: string): Promise<Customer | null> {
    return this.customerRepository.findOne({
      where: { email },
      relations: ['account'],
    });
  }

  private buildCustomerPayload(dto: CreateCustomerDto, customerNo: string): any {
    const primaryTax = Array.isArray(dto.tax)
      ? dto.tax.find(t => t.isPrimary) ?? dto.tax[0]
      : dto.tax;

    return {
      name: dto.name,
      customerNo,
      transDate: this.formatDateToDDMMYYYY(new Date()),

      email: dto.email,
      mobilePhone: dto.phone,
      billStreet: dto.address,
      billCity: dto.city,
      billProvince: dto.province,
      billZipCode: dto.postalcode,
      billCountry: 'ID',

      taxStreet: primaryTax?.registeredAddress || dto.address,
      taxCity: dto.city,
      taxProvince: dto.province,
      taxZipCode: dto.postalcode,
      taxCountry: 'ID',
      wpName: primaryTax?.taxName || dto.name,
      npwpNo: primaryTax?.taxNumber || '',

      taxSameAsBill: true,
      shipSameAsBill: true,

      detailContact: [
        {
          name: dto.name,
          email: dto.email,
          mobilePhone: dto.phone,
          salutation: 'MR',
        },
      ],

      currencyCode: 'IDR',
    };
  }


  async create(dto: CreateCustomerDto): Promise<Customer> {
    // console.log('Creating customer with DTO:', dto);
    const existingCustomer = await this.findByEmail(dto.email);
    const existingAccount = await this.accountRepository.findOne({
      where: { email: dto.email },
    });

    if (existingCustomer || existingAccount) {
      throw new ConflictException('Email already in use');
    }

    const customer = this.customerRepository.create({
      customer_code: await this.generateCustomerCode(),
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      npwp: dto.tax?.find((t) => t.isPrimary)?.taxNumber || '',
      address: dto.address,
      city: dto.city,
      province: dto.province,
      postalcode: dto.postalcode,
    });
    const savedCustomer = await this.customerRepository.save(customer);
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
          ownerType: 'customer',
          ownerId: savedCustomer.id,
        }),
      );
      await this.addressRepo.save(addressEntities);
    }

    if (dto.tax && dto.tax.length > 0) {
      const taxs = dto.tax.map((tax) =>
        this.taxRepo.create({
          taxType: tax.taxType,
          taxNumber: tax.taxNumber,
          taxName: tax.taxName,
          registeredAddress: tax.registeredAddress,
          isActive: tax.isActive ?? true,
          isPrimary: tax.isPrimary ?? false,
          ownerType: 'customer', // ✅ Required field
          ownerId: savedCustomer.id, // ✅ Required field
        }),
      );
      await this.taxRepo.save(taxs);
    }

    // ✅ Save Bank Accounts EXPLICITLY with required fields
    if (dto.bankAccounts && dto.bankAccounts.length > 0) {
      const banks = dto.bankAccounts.map((bank) =>
        this.bankAccountRepo.create({
          bankName: bank.bankName,
          accountNumber: bank.accountNumber,
          accountName: bank.accountName,
          branch: bank.branch,
          isPrimary: bank.isPrimary ?? false,
          ownerType: 'customer', // ✅ Required field
          ownerId: savedCustomer.id, // ✅ Required field
        }),
      );
      await this.bankAccountRepo.save(banks);
    }

    // Simpan akun login
    let passwordHash: string;
    if (dto.password) {
      passwordHash = await bcrypt.hash(dto.password, 10);
    } else {
      passwordHash = await bcrypt.hash(dto.email, 10);
    }

    const account = this.accountRepository.create({
      username: dto.email,
      email: dto.email,
      password: passwordHash,
      role: 'customer',
      customer_id: savedCustomer.id,
    });

    await this.accountRepository.save(account);
    // Payload untuk Accurate
    const accuratePayload = this.buildCustomerPayload(dto, savedCustomer.customer_code);
    console.log('Accurate Payload:', accuratePayload);
    await this.accurateService.addCustomerToAccurate(accuratePayload);
    return savedCustomer;
  }

  async update(id: number, dto: UpdateCustomerDto): Promise<Customer> {
    const customer = await this.findOne(id);
    if (!customer) throw new NotFoundException('Supplier not found');

    const { tax, bankAccounts, ...customerData } = dto;

    Object.assign(customer, customerData);
    await this.customerRepository.save(customer);

    // Update or create tax info
    if (tax) {
      const existingTax = await this.taxRepo.findOne({
        where: {
          ownerType: 'customer',
          ownerId: customer.id,
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
          ownerType: 'customer',
          ownerId: customer.id,
        });
        await this.taxRepo.save(newTax);
      }
    }

    // Replace all bank accounts
    if (bankAccounts && bankAccounts.length > 0) {
      await this.bankAccountRepo.delete({
        ownerType: 'customer',
        ownerId: customer.id,
      });

      const newBankAccounts = bankAccounts.map((bank) =>
        this.bankAccountRepo.create({
          bankName: bank.bankName,
          accountNumber: bank.accountNumber,
          accountName: bank.accountName,
          branch: bank.branch,
          isPrimary: bank.isPrimary ?? false,
          ownerType: 'customer',
          ownerId: customer.id,
        }),
      );

      await this.bankAccountRepo.save(newBankAccounts);
    }

    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const customer = await this.findOne(id);
    if (!customer) throw new NotFoundException('Customer not found');

    await this.bankAccountRepo.delete({
      ownerType: 'customer',
      ownerId: id,
    });

    await this.taxRepo.delete({
      ownerType: 'customer',
      ownerId: id,
    });
    // Hapus semua alamat yang terkait dengan customer
    await this.addressRepo.delete({
      ownerType: 'customer',
      ownerId: id,
    });

    // Optional: hapus akun jika ada entitas account
    await this.accountRepository.delete({ customer_id: id }); // <-- Pastikan ini sesuai struktur kamu
    await this.accurateService.deleteCustomer(customer.customer_code);
    await this.customerRepository.delete(id);
  }

  // ✅ Tambahkan alamat baru ke customer
  async addAddress(customerId: number, addressDto: Partial<Addresses>): Promise<Addresses> {
    const customer = await this.findOne(customerId);
    if (!customer) throw new NotFoundException('Customer not found');

    const newAddress = this.addressRepo.create({
      ...addressDto,
      ownerId: customerId,
      ownerType: 'customer',
      is_default: addressDto.is_default ?? false,
    });

    // Jika alamat baru diset sebagai default, set alamat lain milik customer menjadi non-default
    if (newAddress.is_default) {
      await this.addressRepo.update(
        {
          ownerId: customerId,
          ownerType: 'customer',
          is_default: true,
        },
        { is_default: false },
      );
    }

    return this.addressRepo.save(newAddress);
  }

  async getActiveAddresses(customerId: number): Promise<Addresses[]> {
    return this.addressRepo.find({
      where: {
        ownerId: customerId,
        is_deleted: false,
      },
    });
  }

  // ✅ Set alamat tertentu sebagai default
  async setDefaultAddress(customerId: number, addressId: number): Promise<Addresses> {
    const address = await this.addressRepo.findOne({
      where: { id: addressId, ownerId: customerId },
    });

    if (!address) {
      throw new NotFoundException('Address not found for this customer');
    }

    // Reset semua is_default jadi false
    await this.addressRepo.update(
      { ownerId: customerId },
      { is_default: false },
    );

    // Set yang dipilih jadi true
    address.is_default = true;
    return this.addressRepo.save(address);
  }

  async softDelete(id: number): Promise<{ message: string }> {
    const address = await this.addressRepo.findOne({
      where: { id, is_deleted: false },
    });

    if (!address) {
      throw new NotFoundException('Address not found or already deleted');
    }

    address.is_deleted = true;

    await this.addressRepo.save(address);

    return { message: `Address ID ${id} has been soft-deleted.` };
  }
}
