import {
  IsOptional,
  IsString,
  IsEmail,
  ValidateNested,
  IsEnum,
  IsBoolean,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

// ✅ Update-specific DTOs with different validation rules
class UpdateTaxDto {
  @ApiPropertyOptional({ 
    example: 'npwp', 
    enum: ['npwp', 'pkp', 'others'],
    description: 'Jenis pajak'
  })
  @IsOptional()
  @IsEnum(['npwp', 'pkp', 'others'])
  taxType?: 'npwp' | 'pkp' | 'others';

  @ApiPropertyOptional({
    example: '01.234.567.8-999.000',
    description: 'Nomor NPWP supplier',
  })
  @IsOptional()
  @IsString()
  taxNumber?: string;

  @ApiPropertyOptional({
    example: 'PT. Sumber Makmur',
    description: 'Nama sesuai NPWP',
  })
  @IsOptional()
  @IsString()
  taxName?: string;

  @ApiPropertyOptional({
    example: 'Jl. Pajak No. 12, Jakarta',
    description: 'Alamat terdaftar di NPWP',
  })
  @IsOptional()
  @IsString()
  registeredAddress?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

class UpdateBankAccountDto {
  @ApiPropertyOptional({
    example: 'Bank BCA',
    description: 'Nama bank',
  })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({
    example: '1234567890',
    description: 'Nomor rekening',
  })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiPropertyOptional({
    example: 'PT. Sumber Makmur',
    description: 'Nama pemilik rekening',
  })
  @IsOptional()
  @IsString()
  accountName?: string;

  @ApiPropertyOptional({
    example: 'Cabang Sudirman',
    description: 'Cabang bank',
  })
  @IsOptional()
  @IsString()
  branch?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Apakah ini rekening utama?',
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdateSupplierDto {
  @ApiPropertyOptional({ example: 'PT. Sumber Makmur Baru' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Jl. Merdeka No. 456, Jakarta' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '081234567891' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'newsumbermakmur@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Data NPWP supplier',
    type: UpdateTaxDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateTaxDto)
  tax?: UpdateTaxDto;

  @ApiPropertyOptional({
    description: 'Daftar rekening bank supplier',
    type: [UpdateBankAccountDto],
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateBankAccountDto)
  bankAccounts?: UpdateBankAccountDto[];
}