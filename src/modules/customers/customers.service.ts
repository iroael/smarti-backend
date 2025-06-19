import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../entities/customer.entity';
import { CustomerAddress } from 'src/entities/customer-address.entity';
import { Account } from 'src/entities/account.entity';
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
  ) {}

  async findAll(): Promise<Customer[]> {
    return this.customerRepository.find({ relations: ['addresses'] });
  }

  async findOne(id: number): Promise<Customer | null> {
    return this.customerRepository.findOne({
      where: { id },
      relations: ['addresses'],
    });
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
      npwp: dto.npwp,
      address: dto.address,
      city: dto.city,
      province: dto.province,
      postalcode: dto.postalcode,
    });
    const savedCustomer = await this.customerRepository.save(customer);

    // Simpan alamat default
    const defaultAddress = this.customerAddressRepository.create({
      customer: savedCustomer,
      name: savedCustomer.name,
      phone: savedCustomer.phone,
      city: savedCustomer.city,
      province: savedCustomer.province,
      address: savedCustomer.address,
      postalcode: savedCustomer.postalcode,
      is_default: true,
    });
    await this.customerAddressRepository.save(defaultAddress);

    // Simpan akun login
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const account = this.accountRepository.create({
      username: dto.email,
      email: dto.email,
      password: passwordHash,
      role: 'customer',
      customer: savedCustomer,
    });

    await this.accountRepository.save(account);

    return savedCustomer;
  }

  async update(id: number, dto: UpdateCustomerDto): Promise<Customer> {
    const customer = await this.findOne(id);
    if (!customer) throw new NotFoundException('Customer not found');

    Object.assign(customer, dto);
    return this.customerRepository.save(customer);
  }

  async remove(id: number): Promise<Customer> {
    const customer = await this.findOne(id);
    if (!customer) throw new NotFoundException('Customer not found');
    await this.customerRepository.remove(customer);
    return customer;
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
