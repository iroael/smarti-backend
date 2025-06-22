import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class TaxDto {
  @ApiProperty({
    example: 'npwp',
    enum: ['npwp', 'pkp', 'others'],
    required: false,
    default: 'npwp',
  })
  @IsOptional()
  @IsString()
  taxType?: 'npwp' | 'pkp' | 'others';

  @ApiProperty({ example: '01.234.567.8-999.000' })
  @IsOptional()
  @IsString()
  taxNumber?: string;

  @ApiProperty({ example: 'PT Maju Jaya' })
  @IsOptional()
  @IsString()
  taxName?: string;

  @ApiProperty({ example: 'Jl. Pajak No. 45, Jakarta', required: false })
  @IsOptional()
  @IsString()
  registeredAddress?: string;

  @ApiProperty({ example: true, required: false, default: true })
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ example: false, required: false, default: false })
  @IsOptional()
  isPrimary?: boolean;
}

class BankAccountDto {
  @ApiProperty({ example: 'Bank BCA' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiProperty({ example: '1234567890' })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiProperty({ example: 'PT Sumber Makmur' })
  @IsOptional()
  @IsString()
  accountName?: string;

  @ApiProperty({ example: 'Cabang Sudirman', required: false })
  @IsOptional()
  @IsString()
  branch?: string;

  @ApiProperty({ example: false, required: false, default: false })
  @IsOptional()
  isPrimary?: boolean;
}

export class UpdateCustomerDto {
  @ApiProperty({ example: 'John Doe', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'john@example.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'securePassword123', required: false })
  @IsOptional()
  @MinLength(6)
  password?: string;

  @ApiProperty({ example: '081234567890', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: '09.123.456.7-890.000', required: false })
  @IsOptional()
  @IsString()
  npwp?: string;

  @ApiProperty({ example: 'Bandung', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: 'Jawa Barat', required: false })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiProperty({ example: 'Jl. Merdeka No. 123', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: '40111', required: false })
  @IsOptional()
  @IsString()
  postalcode?: string;

  @ApiProperty({ type: () => TaxDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => TaxDto)
  tax?: TaxDto;

  @ApiProperty({ type: () => [BankAccountDto], required: false })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BankAccountDto)
  bankAccounts?: BankAccountDto[];
}
