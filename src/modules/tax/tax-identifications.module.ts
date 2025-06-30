import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaxIdentification } from 'src/entities/tax-identifications.entity';
import { TaxIdentificationsService } from './tax-identifications.service';
import { TaxIdentificationsController } from './tax-identifications.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TaxIdentification])],
  controllers: [TaxIdentificationsController],
  providers: [TaxIdentificationsService],
  exports: [TaxIdentificationsService],
})
export class TaxIdentificationsModule {}
