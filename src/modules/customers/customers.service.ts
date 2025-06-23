import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Customer } from '../../entities/customer.entity';
import { CustomerAddress } from 'src/entities/customer-address.entity';
import { BankAccount } from 'src/entities/bank-account.entity';
import { TaxIdentification } from 'src/entities/tax-identifications.entity';
import { Account } from 'src/entities/account.entity';
import { Addresses } from 'src/entities/address.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,

    @InjectRepository(Account)
    private accountRepository: Repository<Account>,

    @InjectRepository(CustomerAddress)
    private customerAddressRepository: Repository<CustomerAddress>,

    @InjectRepository(BankAccount)
    private bankAccountRepo: Repository<BankAccount>,

    @InjectRepository(TaxIdentification)
    private taxRepo: Repository<TaxIdentification>,

    @InjectRepository(Addresses)
    private addressRepo: Repository<Addresses>,
  ) {}

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

  async findAll(): Promise<any[]> {
    const customers = await this.customerRepository.find({
      relations: ['addresses'],
    });

    const customerIds = customers.map((c) => c.id);

    const taxList = await this.taxRepo.find({
      where: {
        ownerType: 'customer',
        ownerId: In(customerIds),
      },
    });

    const bankList = await this.bankAccountRepo.find({
      where: {
        ownerType: 'customer',
        ownerId: In(customerIds),
      },
    });

    const taxGrouped = this.groupBy(taxList, (tax) => tax.ownerId);
    const bankGrouped = this.groupBy(bankList, (bank) => bank.ownerId);

    return customers.map((customer) => ({
      ...customer,
      tax: taxGrouped[customer.id] || [],
      bank: bankGrouped[customer.id] || [],
    }));
  }

  async findOne(id: number): Promise<Customer & { tax?: TaxIdentification, bankAccounts?: BankAccount[] }> {
    const customer = await this.customerRepository.findOne({
      where: { id },
      relations: ['addresses'],
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const taxData = await this.taxRepo.findOne({
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
      ...customer,
      tax: taxData ?? undefined, // ✅ null diubah jadi undefined
      bankAccounts,
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

  async create(dto: CreateCustomerDto): Promise<Customer> {
    const existingCustomer = await this.findByEmail(dto.email);
    const existingAccount = await this.accountRepository.findOne({
      where: { email: dto.email },
    });

    if (existingCustomer || existingAccount) {
      throw new ConflictException('Email already in use');
    }

    const customer = this.customerRepository.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      npwp: dto.tax?.taxNumber,
      address: dto.address,
      city: dto.city,
      province: dto.province,
      postalcode: dto.postalcode,
    });
    const savedCustomer = await this.customerRepository.save(customer);

    if (dto.addresses) {
      const addressCustomer = this.addressRepo.create({
        name: dto.addresses.name,
        phone: dto.addresses.phone,
        city: dto.addresses.city,
        province: dto.addresses.province,
        address: dto.addresses.address,
        postalcode: dto.addresses.postalcode,
        is_default: dto.addresses.is_default ?? false,
        is_deleted: dto.addresses.is_deleted ?? false,
        ownerType: 'customer', // ✅ Required field
        ownerId: savedCustomer.id, // ✅ Required field
      });
      await this.addressRepo.save(addressCustomer);
    } else {
      // jika tidak ada inputan dari user langsung di setup sebagai default
      const defaultAddress = this.addressRepo.create({
        name: savedCustomer.name,
        phone: savedCustomer.phone,
        city: savedCustomer.city,
        province: savedCustomer.province,
        ownerType: 'customer', // ✅ Required field
        ownerId: savedCustomer.id, // ✅ Required field
        is_default: true,
        address: savedCustomer.address,
        postalcode: savedCustomer.postalcode,
      });
      await this.addressRepo.save(defaultAddress);
    }

    if (dto.tax) {
      const tax = this.taxRepo.create({
        taxType: dto.tax.taxType,
        taxNumber: dto.tax.taxNumber,
        taxName: dto.tax.taxName,
        registeredAddress: dto.tax.registeredAddress,
        isActive: dto.tax.isActive ?? true,
        isPrimary: dto.tax.isPrimary ?? false,
        ownerType: 'customer', // ✅ Required field
        ownerId: savedCustomer.id, // ✅ Required field
      });
      await this.taxRepo.save(tax);
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
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const account = this.accountRepository.create({
      username: dto.email,
      email: dto.email,
      password: passwordHash,
      role: 'customer',
      customer_id: savedCustomer.id,
    });

    await this.accountRepository.save(account);

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

    // Hapus semua alamat customer
    await this.customerAddressRepository.delete({
      customer: { id },
    });

    // Optional: hapus akun jika ada entitas account
    await this.accountRepository.delete({ customer_id: id }); // <-- Pastikan ini sesuai struktur kamu

    await this.customerRepository.delete(id);
  }

  // ✅ Tambahkan alamat baru ke customer
  async addAddress(customerId: number, addressDto: Partial<CustomerAddress>): Promise<CustomerAddress> {
    const customer = await this.findOne(customerId);
    if (!customer) throw new NotFoundException('Customer not found');

    const newAddress = this.customerAddressRepository.create({
      ...addressDto,
      customer,
      is_default: addressDto.is_default ?? false,
    });

    // Jika is_default = true, ubah semua yang lain jadi false
    if (newAddress.is_default) {
      await this.customerAddressRepository.update(
        { customer: { id: customerId } },
        { is_default: false },
      );
    }

    return this.customerAddressRepository.save(newAddress);
  }

  async getActiveAddresses(customerId: number): Promise<CustomerAddress[]> {
    return this.customerAddressRepository.find({
      where: {
        customer: { id: customerId },
        is_deleted: false,
      },
    });
  }

  // ✅ Set alamat tertentu sebagai default
  async setDefaultAddress(customerId: number, addressId: number): Promise<CustomerAddress> {
    const address = await this.customerAddressRepository.findOne({
      where: { id: addressId, customer: { id: customerId } },
    });

    if (!address) {
      throw new NotFoundException('Address not found for this customer');
    }

    // Reset semua is_default jadi false
    await this.customerAddressRepository.update(
      { customer: { id: customerId } },
      { is_default: false },
    );

    // Set yang dipilih jadi true
    address.is_default = true;
    return this.customerAddressRepository.save(address);
  }

  async softDelete(id: number): Promise<{ message: string }> {
    const address = await this.customerAddressRepository.findOne({
      where: { id, is_deleted: false },
      relations: ['customer'],
    });

    if (!address) {
      throw new NotFoundException('Address not found or already deleted');
    }

    address.is_deleted = true;

    await this.customerAddressRepository.save(address);

    return { message: `Address ID ${id} has been soft-deleted.` };
  }
}
