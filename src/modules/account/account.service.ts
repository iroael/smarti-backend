import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from 'src/entities/account.entity';
import { User } from 'src/entities/user.entity';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findAll(): Promise<Account[]> {
    return this.accountRepo.find({ relations: ['user'] });
  }

  async findOne(id: number): Promise<Account> {
    const account = await this.accountRepo.findOne({
      where: { id },
      relations: ['user', 'supplier', 'customer'],
    });

    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }

    return account;
  }

  async create(dto: CreateAccountDto): Promise<Account> {
    const existing = await this.accountRepo.findOne({
      where: [{ email: dto.email }, { username: dto.username }],
    });

    if (existing) {
      throw new ConflictException('Email or username already in use');
    }

    // 1. Buat user terlebih dahulu
    const newUser = this.userRepo.create({
      name: dto.name,
      email: dto.email,
    });
    const savedUser = await this.userRepo.save(newUser);

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 3. Buat akun login
    const newAccount = this.accountRepo.create({
      username: dto.username,
      email: dto.email,
      password: hashedPassword,
      role: dto.role,
      user: savedUser,
    });

    try {
      return await this.accountRepo.save(newAccount);
    } catch (err) {
      throw new InternalServerErrorException('Failed to create account');
    }
  }

  async update(id: number, dto: UpdateAccountDto): Promise<Account> {
    const account = await this.findOne(id);

    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }

    Object.assign(account, dto);

    try {
      return await this.accountRepo.save(account);
    }
    catch (err) {
      throw new InternalServerErrorException('Failed to update account');
    }
  }

  async remove(id: number): Promise<{ message: string }> {
    const account = await this.findOne(id);
    await this.accountRepo.remove(account);

    // Optional: remove the linked user
    if (account.user) {
      await this.userRepo.remove(account.user);
    }

    return { message: `Account with ID ${id} has been deleted` };
  }
}
