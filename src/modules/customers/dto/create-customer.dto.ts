import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  ValidateNested,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CreateAddressDto } from 'src/modules/address/dto/create-address.dto';

// Optional: Move these two to their own files (e.g., dto/bank-account.dto.ts, dto/tax.dto.ts) for reuse

class TaxDto {
  @ApiProperty({
    example: 'npwp',
    enum: ['npwp', 'pkp', 'others'],
    required: false,
    default: 'npwp',
  })
  @IsOptional()
  @IsEnum(['npwp', 'pkp', 'others'])
  taxType?: 'npwp' | 'pkp' | 'others';

  @ApiProperty({ example: '09.123.456.7-890.000' })
  @IsNotEmpty()
  @IsString()
  taxNumber: string;

  @ApiProperty({ example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  taxName: string;

  @ApiProperty({ example: 'Jl. Pajak No. 99', required: false })
  @IsOptional()
  @IsString()
  registeredAddress?: string;

  @ApiProperty({ example: true, required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: false, required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

class BankAccountDto {
  @ApiProperty({ example: 'Bank Mandiri' })
  @IsNotEmpty()
  @IsString()
  bankName: string;

  @ApiProperty({ example: '1234567890' })
  @IsNotEmpty()
  @IsString()
  accountNumber: string;

  @ApiProperty({ example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  accountName: string;

  @ApiProperty({ example: 'Cabang Dago', required: false })
  @IsOptional()
  @IsString()
  branch?: string;

  @ApiProperty({ example: true, required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class CreateCustomerDto {
  @ApiProperty({ example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'securePassword123' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: '081234567890' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({ example: 'Bandung' })
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty({ example: 'Jawa Barat' })
  @IsNotEmpty()
  @IsString()
  province: string;

  @ApiProperty({ example: 'Jl. Merdeka No. 123' })
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty({ example: '40111' })
  @IsNotEmpty()
  @IsString()
  postalcode: string;

  @ApiProperty({ type: () => [CreateAddressDto], required: false })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateAddressDto)
  addresses?: CreateAddressDto[];

  @ApiProperty({ type: () => [TaxDto], required: false })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TaxDto)
  tax?: TaxDto[];

  @ApiProperty({ type: () => [BankAccountDto], required: false })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BankAccountDto)
  bankAccounts?: BankAccountDto[];
}
