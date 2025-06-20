import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Account } from 'src/entities/account.entity';
import { Customer } from 'src/entities/customer.entity';
import { Role } from 'src/common/enums/role.enum'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,

    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,

    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string): Promise<any> {
    const account = await this.accountRepository.findOne({
      where: { email },
      relations: ['customer', 'supplier', 'user'],
    });

    if (!account) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: account.id,
      email: account.email,
      role: account.role,
      customerId: account.customer?.id ?? null,
      supplierId: account.supplier?.id ?? null,
    };

    let name = '';
    let npwp: string | null = null;

    switch (account.role) {
      case Role.Customer:
        name = account.customer?.name ?? '';
        npwp = account.customer?.npwp ?? null;
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
        name,
        npwp, // hanya muncul jika ada
      },
    };
  }

  async getProfile(accountId: number) {
    const account = await this.accountRepository.findOne({
      where: { id: accountId },
      relations: ['customer', 'supplier', 'user'],
    });

    if (!account) throw new UnauthorizedException('User not found');

    // Return detail based on role
    return {
      id: account.id,
      email: account.email,
      role: account.role,
      profile:
        account.role === 'customer'
          ? account.customer
          : account.role === 'supplier'
          ? account.supplier
          : account.user,
    };
  }
}
