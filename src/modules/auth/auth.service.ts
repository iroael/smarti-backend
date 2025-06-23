import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Account } from 'src/entities/account.entity';
import { Customer } from 'src/entities/customer.entity';
import { BankAccount } from 'src/entities/bank-account.entity';
import { CustomerAddress } from 'src/entities/customer-address.entity';
import { Addresses } from 'src/entities/address.entity';
import { TaxIdentification } from 'src/entities/tax-identifications.entity';
import { Role } from 'src/common/enums/role.enum';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,

    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,

    @InjectRepository(BankAccount)
    private bankAccountRepo: Repository<BankAccount>,

    @InjectRepository(Addresses)
    private addressRepo: Repository<Addresses>,

    @InjectRepository(TaxIdentification)
    private taxRepo: Repository<TaxIdentification>,

    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string): Promise<any> {
    const account = await this.accountRepository.findOne({
      where: { email },
      relations: ['supplier', 'user'], // 'customer' dihapus karena sudah bukan relasi
    });

    if (!account) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    let customer: Customer | null = null;
    if (account.role === Role.Customer && account.customer_id) {
      customer = await this.customerRepository.findOne({
        where: { id: account.customer_id },
      });
    }

    const payload = {
      sub: account.id,
      email: account.email,
      role: account.role,
      customerId: account.customer_id ?? null,
      supplierId: account.supplier?.id ?? null,
    };

    let name = '';
    let npwp: string | null = null;

    switch (account.role) {
      case Role.Customer:
        name = customer?.name ?? '';
        npwp = customer?.npwp ?? null;
        break;
      case Role.Supplier:
        name = account.supplier?.name ?? '';
        break;
      case Role.Admin:
        name = account.user?.name ?? '';
        break;
    }

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: account.id,
        email: account.email,
        role: account.role,
        customer_id: account.customer_id,
        supplier_id: account.customer_id,
        name,
        npwp,
      },
    };
  }

  async getProfile(accountId: number) {
    const account = await this.accountRepository.findOne({
      where: { id: accountId },
      relations: ['supplier', 'user'], // relasi customer tidak diperlukan
    });

    if (!account) throw new UnauthorizedException('User not found');

    let profile: any = null;
    let taxData: TaxIdentification | null = null;
    let bankAccounts: BankAccount[] = [];

    if (account.role === Role.Customer && account.customer_id) {
      const customerId = account.customer_id;
      profile = await this.customerRepository.findOne({
        where: { id: customerId },
      });

      const addresses = await this.addressRepo.find({
        where: {
          ownerType: 'customer',
          ownerId: customerId,
        },
      });

      profile.addresses = addresses;
      taxData = await this.taxRepo.findOne({
        where: {
          ownerType: 'customer',
          ownerId: account.customer_id,
        },
      });

      bankAccounts = await this.bankAccountRepo.find({
        where: {
          ownerType: 'customer',
          ownerId: account.customer_id,
        },
      });
    } else if (account.role === Role.Supplier && account.supplier?.id) {
      const supplierId = account.supplier.id;

      profile = account.supplier;

      // Manual load addresses if not using relation
      const addresses = await this.addressRepo.find({
        where: {
          ownerType: 'supplier',
          ownerId: supplierId,
        },
      });

      profile.addresses = addresses;

      taxData = await this.taxRepo.findOne({
        where: {
          ownerType: 'supplier',
          ownerId: account.supplier.id,
        },
      });

      bankAccounts = await this.bankAccountRepo.find({
        where: {
          ownerType: 'supplier',
          ownerId: account.supplier.id,
        },
      });
    } else {
      profile = account.user;
    }

    return {
      id: account.id,
      email: account.email,
      role: account.role,
      profile,
      taxData,
      bankAccounts,
    };
  }

}
