// src/modules/account/accounts.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsService } from './account.service';
import { AccountsController } from './account.controller';
import { Account } from 'src/entities/account.entity';
import { User } from 'src/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Account, User])],
  providers: [AccountsService],
  controllers: [AccountsController],
})
export class AccountsModule {}
